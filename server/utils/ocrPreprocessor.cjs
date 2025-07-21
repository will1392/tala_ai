/**
 * OCR Preprocessor Utility
 * 
 * Provides image enhancement and preprocessing functions
 * to improve OCR accuracy on scanned documents
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class OCRPreprocessor {
  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', 'ocr-preprocess');
    this.initialized = false;
  }

  /**
   * Initialize preprocessor
   */
  async initialize() {
    if (!this.initialized) {
      await fs.mkdir(this.tempDir, { recursive: true });
      this.initialized = true;
    }
  }

  /**
   * Preprocess image for OCR
   * @param {string|Buffer} input - Image path or buffer
   * @param {Object} options - Preprocessing options
   * @returns {Promise<Object>} Processed image info
   */
  async preprocessImage(input, options = {}) {
    await this.initialize();

    const config = {
      grayscale: options.grayscale !== false,
      enhanceContrast: options.enhanceContrast !== false,
      contrastFactor: options.contrastFactor || 1.2,
      denoise: options.denoise !== false,
      sharpen: options.sharpen !== false,
      sharpenAmount: options.sharpenAmount || 2,
      targetDPI: options.targetDPI || 300,
      deskew: options.deskew !== false,
      binaryThreshold: options.binaryThreshold,
      resize: options.resize,
      normalize: options.normalize !== false
    };

    const outputPath = path.join(this.tempDir, `processed-${uuidv4()}.png`);
    const metadata = await sharp(input).metadata();

    try {
      let pipeline = sharp(input);

      // Step 1: Resize to target DPI if needed
      if (config.targetDPI && metadata.density && metadata.density < config.targetDPI) {
        const scaleFactor = config.targetDPI / metadata.density;
        pipeline = pipeline.resize({
          width: Math.round(metadata.width * scaleFactor),
          height: Math.round(metadata.height * scaleFactor),
          kernel: sharp.kernel.lanczos3
        });
      } else if (config.resize) {
        pipeline = pipeline.resize(config.resize);
      }

      // Step 2: Convert to grayscale
      if (config.grayscale) {
        pipeline = pipeline.grayscale();
      }

      // Step 3: Normalize levels
      if (config.normalize) {
        pipeline = pipeline.normalize();
      }

      // Step 4: Enhance contrast
      if (config.enhanceContrast) {
        pipeline = pipeline.linear(config.contrastFactor, -(128 * (config.contrastFactor - 1)));
      }

      // Step 5: Denoise using median filter
      if (config.denoise) {
        pipeline = pipeline.median(3);
      }

      // Step 6: Sharpen
      if (config.sharpen) {
        const sigma = 1 + (config.sharpenAmount * 0.5);
        pipeline = pipeline.sharpen({ sigma });
      }

      // Step 7: Apply binary threshold if specified
      if (config.binaryThreshold) {
        pipeline = pipeline.threshold(config.binaryThreshold);
      }

      // Save processed image
      await pipeline
        .png({ compressionLevel: 9 })
        .toFile(outputPath);

      // Step 8: Deskew if needed
      let finalPath = outputPath;
      if (config.deskew) {
        const deskewResult = await this.deskewImage(outputPath);
        if (deskewResult.corrected) {
          finalPath = deskewResult.path;
          // Clean up intermediate file
          if (finalPath !== outputPath) {
            await fs.unlink(outputPath).catch(() => {});
          }
        }
      }

      // Get final image info
      const finalMetadata = await sharp(finalPath).metadata();

      return {
        path: finalPath,
        originalPath: input,
        metadata: {
          width: finalMetadata.width,
          height: finalMetadata.height,
          channels: finalMetadata.channels,
          format: finalMetadata.format,
          size: finalMetadata.size
        },
        preprocessing: {
          applied: Object.keys(config).filter(k => config[k]),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      // Clean up on error
      await fs.unlink(outputPath).catch(() => {});
      throw error;
    }
  }

  /**
   * Detect and correct image skew
   * @param {string} imagePath - Path to image
   * @returns {Promise<Object>} Deskew result
   */
  async deskewImage(imagePath) {
    try {
      // For now, we'll use a simple approach
      // In production, you might want to use a more sophisticated algorithm
      const metadata = await sharp(imagePath).metadata();
      
      // Simple heuristic: detect if image needs rotation based on aspect ratio
      // This is a placeholder - real deskew would analyze text lines
      if (metadata.width > metadata.height * 1.5) {
        // Likely correctly oriented
        return {
          corrected: false,
          path: imagePath,
          angle: 0
        };
      }

      // For actual deskew, you would:
      // 1. Detect text lines using edge detection
      // 2. Calculate predominant angle using Hough transform
      // 3. Rotate image to correct angle

      // Placeholder: return uncorrected
      return {
        corrected: false,
        path: imagePath,
        angle: 0,
        confidence: 0
      };
    } catch (error) {
      console.error('Deskew error:', error);
      return {
        corrected: false,
        path: imagePath,
        angle: 0,
        error: error.message
      };
    }
  }

  /**
   * Enhance specific document types
   * @param {string|Buffer} input - Image input
   * @param {string} documentType - Type of document
   * @returns {Promise<Object>} Enhanced image info
   */
  async enhanceForDocumentType(input, documentType) {
    const typeSettings = {
      passport: {
        grayscale: true,
        enhanceContrast: true,
        contrastFactor: 1.5,
        sharpen: true,
        sharpenAmount: 3,
        targetDPI: 400
      },
      invoice: {
        grayscale: true,
        denoise: true,
        deskew: true,
        normalize: true,
        targetDPI: 300
      },
      receipt: {
        grayscale: true,
        enhanceContrast: true,
        contrastFactor: 1.8,
        sharpen: true,
        binaryThreshold: 140,
        targetDPI: 300
      },
      handwritten: {
        grayscale: true,
        enhanceContrast: true,
        contrastFactor: 1.3,
        denoise: false, // Preserve fine details
        sharpen: false, // Avoid over-sharpening
        targetDPI: 400
      },
      screenshot: {
        grayscale: false, // Keep color
        sharpen: true,
        sharpenAmount: 1,
        enhanceContrast: false
      }
    };

    const settings = typeSettings[documentType] || {};
    return this.preprocessImage(input, settings);
  }

  /**
   * Auto-enhance image based on quality analysis
   * @param {string|Buffer} input - Image input
   * @returns {Promise<Object>} Enhanced image info
   */
  async autoEnhance(input) {
    const analysis = await this.analyzeImageQuality(input);
    const settings = {};

    // Determine enhancement based on analysis
    if (analysis.brightness < 100) {
      settings.enhanceContrast = true;
      settings.contrastFactor = 1.5;
    }

    if (analysis.contrast < 50) {
      settings.normalize = true;
      settings.enhanceContrast = true;
    }

    if (analysis.sharpness < 0.5) {
      settings.sharpen = true;
      settings.sharpenAmount = 3;
    }

    if (analysis.noise > 0.3) {
      settings.denoise = true;
    }

    // Always convert to grayscale for OCR
    settings.grayscale = true;

    return this.preprocessImage(input, settings);
  }

  /**
   * Analyze image quality metrics
   * @param {string|Buffer} input - Image input
   * @returns {Promise<Object>} Quality metrics
   */
  async analyzeImageQuality(input) {
    const { data, info } = await sharp(input)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = new Uint8Array(data);
    const pixelCount = info.width * info.height;
    const channels = info.channels;

    // Calculate brightness
    let totalBrightness = 0;
    for (let i = 0; i < pixels.length; i += channels) {
      const r = pixels[i];
      const g = channels > 1 ? pixels[i + 1] : r;
      const b = channels > 2 ? pixels[i + 2] : r;
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
    }
    const avgBrightness = totalBrightness / pixelCount;

    // Calculate contrast (simplified)
    let minBrightness = 255;
    let maxBrightness = 0;
    for (let i = 0; i < pixels.length; i += channels) {
      const brightness = (pixels[i] + (pixels[i + 1] || pixels[i]) + (pixels[i + 2] || pixels[i])) / 3;
      minBrightness = Math.min(minBrightness, brightness);
      maxBrightness = Math.max(maxBrightness, brightness);
    }
    const contrast = maxBrightness - minBrightness;

    // Estimate sharpness (using edge detection simplification)
    let edges = 0;
    for (let y = 1; y < info.height - 1; y++) {
      for (let x = 1; x < info.width - 1; x++) {
        const idx = (y * info.width + x) * channels;
        const center = pixels[idx];
        const diff = Math.abs(center - pixels[idx - channels]) +
                     Math.abs(center - pixels[idx + channels]) +
                     Math.abs(center - pixels[idx - info.width * channels]) +
                     Math.abs(center - pixels[idx + info.width * channels]);
        if (diff > 100) edges++;
      }
    }
    const sharpness = edges / pixelCount;

    // Estimate noise (simplified)
    let noiseSum = 0;
    for (let i = channels; i < pixels.length - channels; i += channels) {
      const diff = Math.abs(pixels[i] - pixels[i - channels]);
      if (diff < 10 && diff > 0) noiseSum++;
    }
    const noise = noiseSum / pixelCount;

    return {
      brightness: avgBrightness,
      contrast: contrast,
      sharpness: sharpness,
      noise: noise,
      width: info.width,
      height: info.height,
      aspectRatio: info.width / info.height
    };
  }

  /**
   * Split image into regions for targeted OCR
   * @param {string} imagePath - Path to image
   * @param {Array} regions - Array of regions to extract
   * @returns {Promise<Array>} Array of region image paths
   */
  async extractRegions(imagePath, regions) {
    const results = [];

    for (const region of regions) {
      const outputPath = path.join(this.tempDir, `region-${uuidv4()}.png`);
      
      try {
        await sharp(imagePath)
          .extract({
            left: Math.round(region.x),
            top: Math.round(region.y),
            width: Math.round(region.width),
            height: Math.round(region.height)
          })
          .png()
          .toFile(outputPath);

        results.push({
          path: outputPath,
          region: region,
          id: region.id || uuidv4()
        });
      } catch (error) {
        console.error(`Failed to extract region:`, error);
        results.push({
          region: region,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Clean up temporary files
   * @param {Array<string>} filePaths - Paths to clean up
   */
  async cleanup(filePaths = []) {
    const cleanupPromises = filePaths.map(filePath => 
      fs.unlink(filePath).catch(err => 
        console.error(`Failed to clean up ${filePath}:`, err)
      )
    );

    await Promise.all(cleanupPromises);
  }

  /**
   * Clean up all temporary files
   */
  async cleanupAll() {
    try {
      const files = await fs.readdir(this.tempDir);
      await this.cleanup(files.map(f => path.join(this.tempDir, f)));
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

// Export singleton instance
module.exports = new OCRPreprocessor();