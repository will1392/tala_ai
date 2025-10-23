import { buildApiUrl } from '../utils/api';

export interface ImageAnalysisItem {
  fileName: string;
  description?: string;
  detectedText?: string[];
  tags?: string[];
  success: boolean;
  error?: string;
  mimeType?: string;
  size?: number;
}

export interface ImageAnalysisResult {
  success: boolean;
  analyses: ImageAnalysisItem[];
  error?: string;
}

export interface AudioTranscriptionItem {
  fileName: string;
  transcript?: string;
  language?: string;
  duration?: number;
  confidence?: number;
  success: boolean;
  error?: string;
}

export interface AudioTranscriptionResult {
  success: boolean;
  transcriptions: AudioTranscriptionItem[];
  error?: string;
}

export class MediaProcessingService {
  static async analyzeImages(files: File[]): Promise<ImageAnalysisResult | null> {
    if (!files.length) return null;

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('file', file);
      });
      formData.append('userId', 'admin-1');

      const response = await fetch(buildApiUrl('media/analyze-images'), {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Image analysis failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Image analysis error:', error);
      return {
        success: false,
        analyses: [],
        error: error instanceof Error ? error.message : 'Unknown image analysis error'
      };
    }
  }

  static async transcribeAudio(files: File[]): Promise<AudioTranscriptionResult | null> {
    if (!files.length) return null;

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('file', file);
      });
      formData.append('userId', 'admin-1');

      const response = await fetch(buildApiUrl('media/transcribe'), {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Audio transcription failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Audio transcription error:', error);
      return {
        success: false,
        transcriptions: [],
        error: error instanceof Error ? error.message : 'Unknown audio transcription error'
      };
    }
  }

  static formatImageAnalysisForDisplay(result: ImageAnalysisResult | null): string {
    if (!result || !result.analyses || result.analyses.length === 0) {
      return '';
    }

    if (!result.success) {
      return `## 🖼️ Image Analysis\n\n❌ **Analysis failed:** ${result.error || 'Unknown error'}`;
    }

    let formatted = '## 🖼️ Image Analysis\n\n';

    result.analyses.forEach(item => {
      formatted += `**${item.fileName}**\n`;
      if (item.success) {
        if (item.description) {
          formatted += `${item.description.trim()}\n`;
        }
        if (item.detectedText && item.detectedText.length > 0) {
          formatted += '\n*Detected text:*\n';
          item.detectedText.forEach(text => {
            formatted += `• ${text}\n`;
          });
        }
        if (item.tags && item.tags.length > 0) {
          formatted += '\n*Keywords:* ' + item.tags.join(', ') + '\n';
        }
      } else {
        formatted += `⚠️ ${item.error || 'Could not analyze this image.'}\n`;
      }
      formatted += '\n';
    });

    return formatted.trim();
  }

  static formatAudioTranscriptionsForDisplay(result: AudioTranscriptionResult | null): string {
    if (!result || !result.transcriptions || result.transcriptions.length === 0) {
      return '';
    }

    if (!result.success) {
      return `## 🎧 Audio Transcriptions\n\n❌ **Transcription failed:** ${result.error || 'Unknown error'}`;
    }

    let formatted = '## 🎧 Audio Transcriptions\n\n';

    result.transcriptions.forEach(item => {
      formatted += `**${item.fileName}**\n`;
      if (item.success) {
        if (item.transcript) {
          formatted += `${item.transcript.trim()}\n`;
        }
        if (item.language || item.duration) {
          const meta: string[] = [];
          if (item.language) meta.push(`Language: ${item.language}`);
          if (item.duration) meta.push(`Duration: ${item.duration.toFixed(1)}s`);
          if (item.confidence) meta.push(`Confidence: ${(item.confidence * 100).toFixed(0)}%`);
          if (meta.length > 0) {
            formatted += `_${meta.join(' · ')}_\n`;
          }
        }
      } else {
        formatted += `⚠️ ${item.error || 'Could not transcribe this audio file.'}\n`;
      }
      formatted += '\n';
    });

    return formatted.trim();
  }
}

export default MediaProcessingService;