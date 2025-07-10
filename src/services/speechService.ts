/**
 * Speech-to-Text Service
 * 
 * Provides voice input capabilities for TALA AI using the Web Speech API.
 * Handles speech recognition, language support, and error handling.
 */

// Custom result interface to avoid conflicts with native types
export interface TalaSpeechResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechServiceConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export class SpeechService {
  private recognition: any = null;
  private isListening = false;
  private onResultCallback: ((result: any) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStartCallback: (() => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor(config: SpeechServiceConfig = {}) {
    if (this.isSupported()) {
      this.initializeRecognition(config);
    }
  }

  /**
   * Check if speech recognition is supported in the browser
   */
  isSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  /**
   * Initialize speech recognition with configuration
   */
  private initializeRecognition(config: SpeechServiceConfig) {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    this.recognition = new SpeechRecognition();
    this.recognition.lang = config.language || 'en-US';
    this.recognition.continuous = config.continuous || false;
    this.recognition.interimResults = config.interimResults || true;
    this.recognition.maxAlternatives = config.maxAlternatives || 1;

    // Set up event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStartCallback?.();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onEndCallback?.();
    };

    this.recognition.onresult = (event: any) => {
      const results = event.results;
      const lastResult = results[results.length - 1];
      
      if (lastResult) {
        const transcript = lastResult[0].transcript;
        const confidence = lastResult[0].confidence || 0.9; // Default confidence if not provided
        const isFinal = lastResult.isFinal;

        this.onResultCallback?.({
          transcript,
          confidence,
          isFinal
        });
      }
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      
      let errorMessage = 'Speech recognition error';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not found. Please check your microphone.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        case 'aborted':
          errorMessage = 'Speech recognition aborted.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      this.onErrorCallback?.(errorMessage);
    };

    this.recognition.onnomatch = () => {
      this.onErrorCallback?.('No speech match found. Please try again.');
    };
  }

  /**
   * Start listening for speech
   */
  start(): void {
    if (!this.isSupported()) {
      this.onErrorCallback?.('Speech recognition is not supported in your browser.');
      return;
    }

    if (!this.recognition) {
      this.onErrorCallback?.('Speech recognition not initialized.');
      return;
    }

    if (this.isListening) {
      return; // Already listening
    }

    try {
      this.recognition.start();
    } catch (error) {
      this.onErrorCallback?.('Failed to start speech recognition.');
    }
  }

  /**
   * Stop listening for speech
   */
  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * Abort speech recognition immediately
   */
  abort(): void {
    if (this.recognition && this.isListening) {
      this.recognition.abort();
    }
  }

  /**
   * Set callback for speech results
   */
  onResult(callback: (result: any) => void): void {
    this.onResultCallback = callback;
  }

  /**
   * Set callback for errors
   */
  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Set callback for when speech recognition starts
   */
  onStart(callback: () => void): void {
    this.onStartCallback = callback;
  }

  /**
   * Set callback for when speech recognition ends
   */
  onEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }

  /**
   * Get current listening state
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Update language
   */
  setLanguage(language: string): void {
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  /**
   * Get supported languages for travel context
   */
  static getSupportedLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: 'en-US', name: 'English (US)' },
      { code: 'en-GB', name: 'English (UK)' },
      { code: 'es-ES', name: 'Spanish' },
      { code: 'fr-FR', name: 'French' },
      { code: 'de-DE', name: 'German' },
      { code: 'it-IT', name: 'Italian' },
      { code: 'pt-BR', name: 'Portuguese (Brazil)' },
      { code: 'ja-JP', name: 'Japanese' },
      { code: 'ko-KR', name: 'Korean' },
      { code: 'zh-CN', name: 'Chinese (Simplified)' },
      { code: 'ar-SA', name: 'Arabic' },
      { code: 'hi-IN', name: 'Hindi' },
      { code: 'ru-RU', name: 'Russian' },
      { code: 'nl-NL', name: 'Dutch' },
      { code: 'pl-PL', name: 'Polish' }
    ];
  }

  /**
   * Request microphone permission
   */
  static async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }
}

// Create and export singleton instance
export const speechService = new SpeechService();