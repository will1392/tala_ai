/**
 * Image Processing Utilities
 * 
 * Helper functions for image manipulation, extraction, and preparation
 * for visual document analysis
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Temporary directory for image processing
const TEMP_DIR = path.join(process.cwd(), 'temp', 'image-processing');

// Ensure temp directory exists
fs.mkdir(TEMP_DIR, { recursive: true }).catch(() => {});

/**
 * Extract images from a PDF file
 * @param {string} pdfPath - Path to PDF file
 * @param {Object} options - Extraction options
 * @returns {Promise<Array<string>>} Array of extracted image paths
 */
export async function extractImagesFromPDF(pdfPath, options = {}) {
  const extractedImages = [];
  const outputDir = path.join(TEMP_DIR, `pdf-extract-${uuidv4()}`);
  
  try {
    await fs.mkdir(outputDir, { recursive: true });
    
    // Method 1: Try using pdftoppm (from poppler-utils) if available
    try {
      const outputPrefix = path.join(outputDir, 'page');
      await execAsync(`pdftoppm -jpeg -r 150 "${pdfPath}" "${outputPrefix}"`, {
        timeout: 30000
      });
      
      // Find generated images
      const files = await fs.readdir(outputDir);
      const imageFiles = files.filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg'));
      
      for (const file of imageFiles) {
        extractedImages.push(path.join(outputDir, file));
      }
    } catch (error) {
      console.log('pdftoppm not available, using alternative method');
      
      // Method 2: Convert PDF pages to images using sharp (requires pdf support)
      try {
        // This is a placeholder - in production you'd use pdf-lib or similar
        console.log('PDF to image conversion requires additional setup');
      } catch (err) {
        console.error('PDF image extraction failed:', err);
      }
    }
    
    // If no images extracted, create a placeholder
    if (extractedImages.length === 0 && options.createPlaceholder) {
      const placeholderPath = path.join(outputDir, 'placeholder.jpg');
      await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
      .jpeg()
      .toFile(placeholderPath);
      
      extractedImages.push(placeholderPath);
    }
    
    return extractedImages;
  } catch (error) {
    console.error('PDF image extraction error:', error);
    
    // Clean up on error
    await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});
    
    return extractedImages;
  }
}

/**
 * Resize an image while maintaining aspect ratio
 * @param {string} imagePath - Path to source image
 * @param {number} maxSize - Maximum dimension (width or height)
 * @param {Object} options - Resize options
 * @returns {Promise<string>} Path to resized image
 */
export async function resizeImage(imagePath, maxSize = 1920, options = {}) {
  try {
    const outputPath = options.outputPath || 
      path.join(TEMP_DIR, `resized-${uuidv4()}.jpg`);
    
    // Get image metadata
    const metadata = await sharp(imagePath).metadata();
    
    // Calculate new dimensions
    let width, height;
    if (metadata.width > metadata.height) {
      width = Math.min(metadata.width, maxSize);
      height = Math.round((width / metadata.width) * metadata.height);
    } else {
      height = Math.min(metadata.height, maxSize);
      width = Math.round((height / metadata.height) * metadata.width);
    }
    
    // Resize image
    await sharp(imagePath)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: options.quality || 85,
        progressive: true
      })
      .toFile(outputPath);
    
    return outputPath;
  } catch (error) {
    console.error('Image resize error:', error);
    throw error;
  }
}

/**
 * Convert image to base64 string
 * @param {string} imagePath - Path to image file
 * @param {Object} options - Conversion options
 * @returns {Promise<string>} Base64 encoded string
 */
export async function convertToBase64(imagePath, options = {}) {
  try {
    let processedPath = imagePath;
    
    // Optionally resize before converting
    if (options.maxSize) {
      const stats = await fs.stat(imagePath);
      if (stats.size > options.maxSize) {
        processedPath = await resizeImage(imagePath, 1920, {
          quality: 80
        });
      }
    }
    
    // Read and convert to base64
    const buffer = await fs.readFile(processedPath);
    const base64 = buffer.toString('base64');
    
    // Clean up temporary file if created
    if (processedPath !== imagePath) {
      await fs.unlink(processedPath).catch(() => {});
    }
    
    // Return with or without data URI prefix
    if (options.includeDataUri) {
      const fileType = await fileTypeFromBuffer(buffer);
      return `data:${fileType.mime};base64,${base64}`;
    }
    
    return base64;
  } catch (error) {
    console.error('Base64 conversion error:', error);
    throw error;
  }
}

/**
 * Detect and analyze image content
 * @param {string} imagePath - Path to image file
 * @returns {Promise<Object>} Image content analysis
 */
export async function detectImageContent(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata();
    const stats = await sharp(imagePath).stats();
    
    // Analyze image characteristics
    const analysis = {
      dimensions: {
        width: metadata.width,
        height: metadata.height,
        aspectRatio: (metadata.width / metadata.height).toFixed(2)
      },
      format: metadata.format,
      size: metadata.size,
      colorSpace: metadata.space,
      hasAlpha: metadata.hasAlpha,
      density: metadata.density,
      statistics: {
        dominant: stats.dominant,
        entropy: stats.entropy,
        isOpaque: stats.isOpaque,
        channels: stats.channels?.map(ch => ({
          mean: ch.mean,
          std: ch.std,
          min: ch.min,
          max: ch.max
        }))
      }
    };
    
    // Detect content type based on characteristics
    analysis.contentType = detectContentType(analysis);
    
    return analysis;
  } catch (error) {
    console.error('Image content detection error:', error);
    throw error;
  }
}

/**
 * Validate image size and format
 * @param {string} imagePath - Path to image file
 * @param {Object} constraints - Validation constraints
 * @returns {Promise<Object>} Validation result
 */
export async function validateImageSize(imagePath, constraints = {}) {
  const maxSize = constraints.maxSize || 20 * 1024 * 1024; // 20MB default
  const allowedFormats = constraints.formats || ['jpeg', 'jpg', 'png', 'webp', 'gif'];
  const minDimension = constraints.minDimension || 100;
  const maxDimension = constraints.maxDimension || 10000;
  
  try {
    // Check file size
    const stats = await fs.stat(imagePath);
    if (stats.size > maxSize) {
      return {
        valid: false,
        error: `File size (${(stats.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed (${(maxSize / 1024 / 1024).toFixed(2)}MB)`
      };
    }
    
    // Check format and dimensions
    const metadata = await sharp(imagePath).metadata();
    
    if (!allowedFormats.includes(metadata.format)) {
      return {
        valid: false,
        error: `Image format '${metadata.format}' is not allowed. Allowed formats: ${allowedFormats.join(', ')}`
      };
    }
    
    if (metadata.width < minDimension || metadata.height < minDimension) {
      return {
        valid: false,
        error: `Image dimensions (${metadata.width}x${metadata.height}) are below minimum (${minDimension}x${minDimension})`
      };
    }
    
    if (metadata.width > maxDimension || metadata.height > maxDimension) {
      return {
        valid: false,
        error: `Image dimensions (${metadata.width}x${metadata.height}) exceed maximum (${maxDimension}x${maxDimension})`
      };
    }
    
    return {
      valid: true,
      metadata: {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: stats.size
      }
    };
  } catch (error) {
    return {
      valid: false,
      error: `Validation error: ${error.message}`
    };
  }
}

/**
 * Extract text regions from image
 * @param {string} imagePath - Path to image
 * @returns {Promise<Array>} Text regions with coordinates
 */
export async function extractTextRegions(imagePath) {
  try {
    // Preprocess image for better OCR
    const processedPath = path.join(TEMP_DIR, `processed-${uuidv4()}.jpg`);
    
    await sharp(imagePath)
      .grayscale()
      .normalize()
      .sharpen()
      .toFile(processedPath);
    
    // In a real implementation, you would use Tesseract.js or similar
    // For now, return mock regions
    const regions = [
      {
        text: 'Sample text region',
        confidence: 0.95,
        bbox: { x: 10, y: 10, width: 200, height: 50 }
      }
    ];
    
    // Clean up
    await fs.unlink(processedPath).catch(() => {});
    
    return regions;
  } catch (error) {
    console.error('Text extraction error:', error);
    return [];
  }
}

/**
 * Create thumbnail from image
 * @param {string} imagePath - Source image path
 * @param {Object} options - Thumbnail options
 * @returns {Promise<string>} Path to thumbnail
 */
export async function createThumbnail(imagePath, options = {}) {
  const size = options.size || 256;
  const outputPath = options.outputPath || 
    path.join(TEMP_DIR, `thumb-${uuidv4()}.jpg`);
  
  try {
    await sharp(imagePath)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    
    return outputPath;
  } catch (error) {
    console.error('Thumbnail creation error:', error);
    throw error;
  }
}

/**
 * Convert image format
 * @param {string} imagePath - Source image path
 * @param {string} targetFormat - Target format (jpg, png, webp)
 * @param {Object} options - Conversion options
 * @returns {Promise<string>} Path to converted image
 */
export async function convertImageFormat(imagePath, targetFormat, options = {}) {
  const outputPath = options.outputPath || 
    path.join(TEMP_DIR, `converted-${uuidv4()}.${targetFormat}`);
  
  try {
    const sharpInstance = sharp(imagePath);
    
    switch (targetFormat.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
        await sharpInstance.jpeg({ 
          quality: options.quality || 85,
          progressive: true 
        }).toFile(outputPath);
        break;
        
      case 'png':
        await sharpInstance.png({ 
          compressionLevel: options.compressionLevel || 6 
        }).toFile(outputPath);
        break;
        
      case 'webp':
        await sharpInstance.webp({ 
          quality: options.quality || 85 
        }).toFile(outputPath);
        break;
        
      default:
        throw new Error(`Unsupported target format: ${targetFormat}`);
    }
    
    return outputPath;
  } catch (error) {
    console.error('Image format conversion error:', error);
    throw error;
  }
}

/**
 * Detect content type based on image analysis
 * @param {Object} analysis - Image analysis data
 * @returns {string} Detected content type
 */
function detectContentType(analysis) {
  const { dimensions, statistics } = analysis;
  
  // Document-like aspect ratios
  const documentRatios = [1.41, 1.29, 0.77]; // A4, Letter, landscape
  const aspectRatio = parseFloat(dimensions.aspectRatio);
  
  const isDocumentRatio = documentRatios.some(
    ratio => Math.abs(aspectRatio - ratio) < 0.1
  );
  
  // High entropy suggests complex content (photos)
  // Low entropy suggests simple content (documents)
  const avgEntropy = statistics.entropy 
    ? statistics.channels.reduce((sum, ch) => sum + ch.mean, 0) / statistics.channels.length
    : 0;
  
  if (isDocumentRatio && avgEntropy < 5) {
    return 'document';
  } else if (avgEntropy > 7) {
    return 'photo';
  } else {
    return 'mixed';
  }
}

/**
 * Clean up temporary files
 * @param {number} maxAge - Maximum age in milliseconds
 */
export async function cleanupTempFiles(maxAge = 3600000) { // 1 hour default
  try {
    const files = await fs.readdir(TEMP_DIR);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        await fs.unlink(filePath).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Temp file cleanup error:', error);
  }
}

// Schedule periodic cleanup
setInterval(() => cleanupTempFiles(), 3600000); // Every hour