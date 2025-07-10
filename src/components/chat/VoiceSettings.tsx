/**
 * Voice Settings Component
 * 
 * Provides controls for speech recognition settings including
 * language selection, microphone testing, and voice preferences.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  Settings, 
  Check, 
  AlertCircle, 
  Volume2, 
  Languages,
  TestTube
} from 'lucide-react';
import { Button } from '../shared/Button';
import { GlassCard } from '../layout/GlassCard';
import { cn } from '../../utils/cn';
import { SpeechService } from '../../services/speechService';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

interface VoiceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage?: string;
  onLanguageChange?: (language: string) => void;
}

export const VoiceSettings = ({ 
  isOpen, 
  onClose, 
  currentLanguage = 'en-US',
  onLanguageChange 
}: VoiceSettingsProps) => {
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micTestResult, setMicTestResult] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const supportedLanguages = SpeechService.getSupportedLanguages();

  // Test microphone access
  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      const permission = await SpeechService.requestMicrophonePermission();
      setHasPermission(permission);
    } catch (error) {
      setHasPermission(false);
    }
  };

  const {
    isListening: isTestListening,
    transcript: testTranscript,
    error: testError,
    startListening: startTestListening,
    stopListening: stopTestListening,
    resetTranscript: resetTestTranscript
  } = useSpeechRecognition({
    language: selectedLanguage,
    onTranscript: (transcript, isFinal) => {
      if (isFinal && transcript.trim()) {
        setMicTestResult(`✓ Detected: "${transcript}"`);
        setTimeout(() => {
          setMicTestResult(null);
          resetTestTranscript();
        }, 3000);
      }
    },
    onError: (error) => {
      setMicTestResult(`✗ Error: ${error}`);
      setIsTestingMic(false);
      setTimeout(() => setMicTestResult(null), 5000);
    }
  });

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    onLanguageChange?.(languageCode);
  };

  const handleMicTest = async () => {
    if (isTestListening) {
      stopTestListening();
      setIsTestingMic(false);
    } else {
      setIsTestingMic(true);
      setMicTestResult('Say something to test your microphone...');
      await startTestListening();
    }
  };

  const requestPermission = async () => {
    const permission = await SpeechService.requestMicrophonePermission();
    setHasPermission(permission);
    if (permission) {
      setMicTestResult('✓ Microphone permission granted!');
      setTimeout(() => setMicTestResult(null), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md"
        >
          <GlassCard className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Settings size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Voice Settings</h3>
                  <p className="text-sm text-white/60">Configure speech recognition</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
                ×
              </Button>
            </div>

            {/* Microphone Permission */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Mic size={16} />
                <span className="font-medium text-sm">Microphone Access</span>
              </div>
              
              <div className={cn(
                'p-3 rounded-lg border',
                hasPermission 
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : hasPermission === false
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
              )}>
                <div className="flex items-center gap-2">
                  {hasPermission ? (
                    <Check size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  <span className="text-sm">
                    {hasPermission 
                      ? 'Microphone access granted'
                      : hasPermission === false
                      ? 'Microphone access denied'
                      : 'Checking microphone access...'
                    }
                  </span>
                </div>
                
                {hasPermission === false && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={requestPermission}
                    className="mt-2 text-xs"
                  >
                    Request Permission
                  </Button>
                )}
              </div>
            </div>

            {/* Language Selection */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Languages size={16} />
                <span className="font-medium text-sm">Recognition Language</span>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {supportedLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg transition-all',
                      'hover:bg-white/5 border',
                      selectedLanguage === lang.code
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'border-white/10 text-white/80'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{lang.name}</span>
                      {selectedLanguage === lang.code && (
                        <Check size={16} className="text-primary" />
                      )}
                    </div>
                    <div className="text-xs text-white/50 mt-1">{lang.code}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Microphone Test */}
            {hasPermission && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <TestTube size={16} />
                  <span className="font-medium text-sm">Test Microphone</span>
                </div>
                
                <div className="space-y-3">
                  <Button
                    variant={isTestListening ? "outline" : "primary"}
                    size="sm"
                    onClick={handleMicTest}
                    className="w-full"
                    disabled={!hasPermission}
                  >
                    <div className="flex items-center gap-2">
                      {isTestListening ? (
                        <>
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            <Mic size={16} />
                          </motion.div>
                          <span>Stop Test</span>
                        </>
                      ) : (
                        <>
                          <Volume2 size={16} />
                          <span>Test Microphone</span>
                        </>
                      )}
                    </div>
                  </Button>
                  
                  {/* Test Result */}
                  <AnimatePresence>
                    {micTestResult && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={cn(
                          'p-3 rounded-lg text-sm border',
                          micTestResult.startsWith('✓')
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : micTestResult.startsWith('✗')
                            ? 'bg-red-500/10 border-red-500/20 text-red-400'
                            : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        )}
                      >
                        {micTestResult}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Interim transcript during test */}
                  {isTestListening && testTranscript && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 bg-white/5 rounded-lg border border-white/10 text-sm"
                    >
                      <span className="text-white/60">Live transcript: </span>
                      <span className="text-primary">{testTranscript}</span>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-4 border-t border-white/10">
              <div className="text-xs text-white/50">
                💡 Voice input works best in quiet environments with clear speech.
                {!hasPermission && (
                  <span className="block mt-1 text-yellow-400/70">
                    ⚠️ Microphone access is required for voice input to work.
                  </span>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};