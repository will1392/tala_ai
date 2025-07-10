/**
 * Speech Recognition Hook
 * 
 * React hook for integrating speech-to-text functionality
 * with the chat interface.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { speechService, SpeechService } from '../services/speechService';

// Local interface to avoid import issues
interface SpeechResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface UseSpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  toggleListening: () => void;
  resetTranscript: () => void;
  setLanguage: (language: string) => void;
}

export const useSpeechRecognition = (
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const serviceRef = useRef<SpeechService | null>(null);
  const finalTranscriptRef = useRef('');

  // Initialize speech service
  useEffect(() => {
    const service = new SpeechService({
      language: options.language || 'en-US',
      continuous: options.continuous || false,
      interimResults: true
    });
    
    serviceRef.current = service;
    setIsSupported(service.isSupported());

    // Set up event handlers
    service.onStart(() => {
      setIsListening(true);
      setError(null);
      finalTranscriptRef.current = '';
    });

    service.onEnd(() => {
      setIsListening(false);
      // If we have an interim transcript when ending, make it final
      if (interimTranscript && !finalTranscriptRef.current) {
        setTranscript(interimTranscript);
        options.onTranscript?.(interimTranscript, true);
      }
      setInterimTranscript('');
    });

    service.onResult((result: SpeechResult) => {
      if (result.isFinal) {
        const finalText = finalTranscriptRef.current 
          ? `${finalTranscriptRef.current} ${result.transcript}`
          : result.transcript;
        
        finalTranscriptRef.current = finalText;
        setTranscript(finalText);
        setInterimTranscript('');
        options.onTranscript?.(finalText, true);
      } else {
        const interimText = finalTranscriptRef.current 
          ? `${finalTranscriptRef.current} ${result.transcript}`
          : result.transcript;
        
        setInterimTranscript(result.transcript);
        options.onTranscript?.(interimText, false);
      }
    });

    service.onError((error: string) => {
      setError(error);
      setIsListening(false);
      options.onError?.(error);
    });

    return () => {
      service.abort();
    };
  }, [options.language]);

  const startListening = useCallback(async () => {
    if (!serviceRef.current?.isSupported()) {
      setError('Speech recognition is not supported in your browser.');
      return;
    }

    // Request microphone permission first
    const hasPermission = await SpeechService.requestMicrophonePermission();
    if (!hasPermission) {
      setError('Microphone permission denied. Please allow microphone access.');
      return;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
    
    serviceRef.current?.start();
  }, []);

  const stopListening = useCallback(() => {
    serviceRef.current?.stop();
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
    setError(null);
  }, []);

  const setLanguage = useCallback((language: string) => {
    serviceRef.current?.setLanguage(language);
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    setLanguage
  };
};