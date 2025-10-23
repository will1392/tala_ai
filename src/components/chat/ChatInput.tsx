import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Sparkles,
  AlertCircle,
  Database,
  X,
  FileText,
  FileImage,
  FileAudio,
  FileWarning
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { VoiceCategorySelector } from './VoiceCategorySelector';
import { CategoryDetectionService, type Category } from '../../services/categoryDetectionService';
import {
  DocumentUploadOptions,
  type DocumentUploadDecision,
  type UploadableFile
} from './DocumentUploadOptions';
import { DocumentExtractionService, type ExtractionResult } from '../../services/documentExtractionService';
import { MediaProcessingService } from '../../services/mediaProcessingService';
import { buildApiUrl } from '../../utils/api';

interface ChatInputProps {
  onSend: (message: string, attachments?: File[], wasVoiceInput?: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput = ({ onSend, disabled = false, placeholder = "Type your message..." }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<UploadableFile[]>([]);
  const [showVoiceError, setShowVoiceError] = useState(false);
  const [wasVoiceInput, setWasVoiceInput] = useState(false);
  const [showKnowledgePrompt, setShowKnowledgePrompt] = useState(false);
  const [lastVoiceMessage, setLastVoiceMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [suggestedCategory, setSuggestedCategory] = useState<Category | null>(null);
  const [showDocumentOptions, setShowDocumentOptions] = useState(false);
  const [isProcessingDocuments, setIsProcessingDocuments] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  type AttachmentType = UploadableFile['type'];

  const classifyFileType = (file: File): AttachmentType => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('audio/')) return 'audio';

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const documentExtensions = new Set([
      'pdf', 'doc', 'docx', 'txt', 'rtf', 'md', 'markdown', 'ppt', 'pptx', 'csv', 'xls', 'xlsx', 'json'
    ]);

    if (documentExtensions.has(extension)) {
      return 'document';
    }

    if (file.type === 'application/pdf' || file.type.includes('wordprocessingml')) {
      return 'document';
    }

    return 'other';
  };

  const createAttachment = (file: File): UploadableFile => ({
    file,
    type: classifyFileType(file),
    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
  });

  const cleanupAttachment = (attachment: UploadableFile) => {
    if (attachment.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
  };

  const clearAttachments = () => {
    attachments.forEach(cleanupAttachment);
    setAttachments([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Speech recognition integration
  const {
    isListening,
    isSupported: isSpeechSupported,
    transcript,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        setMessage(text);
        setWasVoiceInput(true);
        setLastVoiceMessage(text);
        
        // Detect category for voice input
        const detectedCategory = CategoryDetectionService.detectCategory(text);
        setSuggestedCategory(detectedCategory);
        setSelectedCategory(detectedCategory);
        
        // Auto-focus textarea after speech recognition
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    },
    onError: (error) => {
      setShowVoiceError(true);
      setTimeout(() => setShowVoiceError(false), 5000);
    }
  });

  const handleSend = () => {
    // Don't send if documents need to be processed
    if (attachments.length > 0) {
      setShowDocumentOptions(true);
      return;
    }
    
    if (message.trim()) {
      const messageToSend = message.trim();
      onSend(messageToSend, [], wasVoiceInput);
      
      // Show knowledge base prompt if this was voice input
      if (wasVoiceInput && messageToSend) {
        setShowKnowledgePrompt(true);
      }
      
      setMessage('');
      setWasVoiceInput(false);
      resetTranscript();
      textareaRef.current?.focus();
    }
  };
  
  const handleStoreInKnowledgeBase = async () => {
    if (!lastVoiceMessage) return;
    
    try {
      const response = await fetch(buildApiUrl('voice/store'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: lastVoiceMessage,
          userId: 'admin-1',
          title: `Voice Input - ${new Date().toLocaleDateString()}`,
          primaryFolderId: selectedCategory?.id,
          category: selectedCategory?.slug
        })
      });

      if (!response.ok) {
        throw new Error('Failed to store voice input');
      }

      const result = await response.json();
      console.log('Voice input stored successfully:', result);
      
      setShowKnowledgePrompt(false);
      setLastVoiceMessage('');
      setSelectedCategory(null);
      setSuggestedCategory(null);
    } catch (error) {
      console.error('Failed to store in knowledge base:', error);
    }
  };
  
  const handleDismissKnowledgePrompt = () => {
    setShowKnowledgePrompt(false);
    setLastVoiceMessage('');
    setSelectedCategory(null);
    setSuggestedCategory(null);
  };

  const handleCategorySelect = (category: Category | null) => {
    if (category === null) {
      // Auto-detect was triggered
      const detectedCategory = CategoryDetectionService.detectCategory(lastVoiceMessage);
      setSelectedCategory(detectedCategory);
      setSuggestedCategory(detectedCategory);
    } else {
      setSelectedCategory(category);
    }
  };
  
  const handleVoiceToggle = async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const prepared = files.map(createAttachment);
      setAttachments(prev => [...prev, ...prepared]);
      setShowDocumentOptions(true);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) {
        cleanupAttachment(removed);
      }
      if (next.length === 0) {
        setShowDocumentOptions(false);
      }
      return next;
    });
  };

  const handleDocumentUploadDecision = async (decision: DocumentUploadDecision) => {
    setIsProcessingDocuments(true);
    setShowDocumentOptions(false);
    
    try {
      let extractionResult: ExtractionResult | null = null;
      let storageResult: any = null;
      let imageAnalysisResult: Awaited<ReturnType<typeof MediaProcessingService.analyzeImages>> | null = null;
      let audioTranscriptionResult: Awaited<ReturnType<typeof MediaProcessingService.transcribeAudio>> | null = null;

      // Handle extraction
      const documents = attachments.filter(file => file.type === 'document');
      const images = attachments.filter(file => file.type === 'image');
      const audio = attachments.filter(file => file.type === 'audio');
      const others = attachments.filter(file => file.type === 'other');

      if ((decision.action === 'extract' || decision.action === 'both') && documents.length > 0) {
        extractionResult = await DocumentExtractionService.extractData(
          documents.map(item => item.file),
          decision.extractOptions?.extractType || 'summary'
        );
      }

      if ((decision.action === 'extract' || decision.action === 'both') && images.length > 0) {
        imageAnalysisResult = await MediaProcessingService.analyzeImages(images.map(item => item.file));
      }

      if ((decision.action === 'extract' || decision.action === 'both') && audio.length > 0) {
        audioTranscriptionResult = await MediaProcessingService.transcribeAudio(audio.map(item => item.file));
      }

      // Handle storage
      if (decision.action === 'store' || decision.action === 'both') {
        storageResult = await DocumentExtractionService.uploadAndStore(
          attachments.map(item => item.file),
          decision.storeOptions || {}
        );
      }

      // Send results as a message
      let resultMessage = '';

      if (extractionResult) {
        const documentMessage = DocumentExtractionService.formatExtractionForDisplay(
          extractionResult,
          decision.extractOptions?.extractType || 'summary'
        );

        if (documentMessage) {
          resultMessage += `## 📄 Document Insights\n\n${documentMessage}`;
        }
      }

      if (imageAnalysisResult && imageAnalysisResult.analyses?.length) {
        if (resultMessage) resultMessage += '\n\n---\n\n';
        resultMessage += MediaProcessingService.formatImageAnalysisForDisplay(imageAnalysisResult);
      }

      if (audioTranscriptionResult && audioTranscriptionResult.transcriptions?.length) {
        if (resultMessage) resultMessage += '\n\n---\n\n';
        resultMessage += MediaProcessingService.formatAudioTranscriptionsForDisplay(audioTranscriptionResult);
      }

      if (storageResult) {
        if (resultMessage) resultMessage += '\n\n---\n\n';
        if (storageResult.success) {
          resultMessage += `✅ **Documents stored successfully!**\n\n`;
          storageResult.results.forEach((result: any) => {
            resultMessage += `• **${result.fileName}** - ${result.chunksStored} chunks stored`;

            if (result.mediaType === 'audio') {
              resultMessage += ' _(audio transcript)_';
            }

            resultMessage += '\n';

            if (result.mediaType === 'audio') {
              if (result.transcription?.text) {
                const preview = result.transcription.text.length > 200
                  ? `${result.transcription.text.slice(0, 200)}...`
                  : result.transcription.text;
                resultMessage += `  - Transcript preview: ${preview}\n`;
              }

              if (result.fileUrl) {
                resultMessage += `  - [Listen to audio clip](${result.fileUrl})\n`;
              }
            }
          });
        } else {
          resultMessage += `❌ **Storage failed:** ${storageResult.error}`;
        }
      }

      if (others.length > 0) {
        if (resultMessage) resultMessage += '\n\n---\n\n';
        resultMessage += `⚠️ The following file${others.length > 1 ? 's are' : ' is'} not yet supported for automated processing: ${others
          .map(item => `**${item.file.name}**`)
          .join(', ')}.`;
      }

      // Send the formatted results as a message
      if (resultMessage) {
        onSend(resultMessage);
      }

      // Clear attachments
      clearAttachments();

    } catch (error) {
      console.error('Document processing error:', error);
      onSend(`❌ **Document processing failed:** ${error instanceof Error ? error.message : 'Unknown error'}`);
      clearAttachments();
    } finally {
      setIsProcessingDocuments(false);
    }
  };

  const handleCancelDocumentUpload = () => {
    setShowDocumentOptions(false);
    clearAttachments();
  };

  return (
    <div className="glass-dark border-t border-white/10 p-4 space-y-3">
      {/* Note: Attachments are now handled by DocumentUploadOptions component */}

      <AnimatePresence>
        {attachments.length > 0 && !showDocumentOptions && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex flex-wrap gap-2"
          >
            {attachments.map((attachment, index) => (
              <motion.div
                key={`${attachment.file.name}-${index}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-xs"
              >
                {attachment.type === 'document' && <FileText size={14} className="text-blue-300" />}
                {attachment.type === 'image' && <FileImage size={14} className="text-purple-300" />}
                {attachment.type === 'audio' && <FileAudio size={14} className="text-emerald-300" />}
                {attachment.type === 'other' && <FileWarning size={14} className="text-yellow-300" />}
                <span className="truncate max-w-[140px]">{attachment.file.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="text-white/60 hover:text-white"
                  aria-label={`Remove ${attachment.file.name}`}
                >
                  <X size={12} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <label htmlFor="chat-input" className="sr-only">Message input</label>
          <textarea
            id="chat-input"
            ref={textareaRef}
            value={isListening ? `${message}${interimTranscript}` : message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening... Speak now" : placeholder}
            disabled={disabled || isListening}
            rows={1}
            aria-label="Type your message"
            aria-describedby="chat-input-help"
            aria-invalid={false}
            className={cn(
              'w-full resize-none rounded-xl px-4 py-3 pr-12',
              'glass-input min-h-[48px] max-h-[120px]',
              'focus:outline-none focus:ring-2 focus:ring-primary',
              isListening && 'bg-primary/10 border-primary/30'
            )}
            style={{
              height: 'auto',
              overflowY: message.split('\n').length > 3 ? 'auto' : 'hidden'
            }}
          />
          
          {/* AI Enhance Button */}
          <Button 
            variant="ghost" 
            size="sm"
            className="absolute right-2 bottom-2 p-2 min-h-0 min-w-0"
            aria-label="Enhance message with AI"
            title="Enhance message with AI"
          >
            <Sparkles size={18} className="text-primary" aria-hidden="true" />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            aria-label="Upload files"
            accept={[
              '.pdf,.doc,.docx,.txt,.rtf,.md,.ppt,.pptx,.csv,.xls,.xlsx,.json',
              'image/*',
              'audio/*'
            ].join(',')}
          />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="p-3"
            disabled={disabled}
            aria-label="Attach files"
            title="Attach files"
          >
            <Paperclip size={20} aria-hidden="true" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleVoiceToggle}
            className={cn(
              'p-3 relative',
              isListening && 'text-red-500 bg-red-500/10',
              !isSpeechSupported && 'opacity-50 cursor-not-allowed'
            )}
            disabled={disabled || !isSpeechSupported}
            aria-label={!isSpeechSupported ? 'Speech recognition not supported' : isListening ? 'Stop voice recording' : 'Start voice recording'}
            aria-pressed={isListening}
            title={!isSpeechSupported ? 'Speech recognition not supported' : isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? (
              <>
                <MicOff size={20} aria-hidden="true" />
                <motion.div
                  className="absolute inset-0 rounded-lg border-2 border-red-500"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  aria-hidden="true"
                />
              </>
            ) : (
              <Mic size={20} aria-hidden="true" />
            )}
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={disabled || (!message.trim() && attachments.length === 0) || isProcessingDocuments}
            className="p-3"
            aria-label="Send message"
            title="Send message"
          >
            <Send size={20} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Voice Error Display */}
      <AnimatePresence>
        {showVoiceError && speechError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400"
          >
            <AlertCircle size={16} />
            <span>{speechError}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Voice Listening Indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Mic size={16} />
            </motion.div>
            <span>Listening... Speak clearly</span>
            <Button
              onClick={stopListening}
              variant="ghost"
              size="sm"
              className="ml-auto text-xs text-primary/70 hover:text-primary p-1 min-h-0"
            >
              Stop
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Knowledge Base Storage Prompt */}
      <AnimatePresence>
        {showKnowledgePrompt && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Database size={16} className="text-blue-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-blue-400 font-medium text-sm">Store voice input in knowledge base?</p>
                <p className="text-xs text-white/60 mt-1">This will help improve future responses</p>
              </div>
              <Button
                onClick={handleDismissKnowledgePrompt}
                variant="ghost"
                size="sm"
                className="p-1 text-white/40 hover:text-white/60 min-h-0 min-w-0"
                title="Dismiss"
              >
                <X size={14} />
              </Button>
            </div>
            
            {/* Category Selector */}
            <VoiceCategorySelector
              onCategorySelect={handleCategorySelect}
              suggestedCategory={suggestedCategory}
              voiceContent={lastVoiceMessage}
            />
            
            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2">
              <Button
                onClick={handleDismissKnowledgePrompt}
                variant="ghost"
                size="sm"
                className="text-white/60 hover:text-white/80 text-xs"
              >
                Skip
              </Button>
              <Button
                onClick={handleStoreInKnowledgeBase}
                disabled={!selectedCategory}
                variant="primary"
                size="sm"
                className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-xs"
              >
                Store in {selectedCategory?.name || 'Category'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Upload Options */}
      <AnimatePresence>
        {showDocumentOptions && attachments.length > 0 && (
          <DocumentUploadOptions
            files={attachments}
            onConfirm={handleDocumentUploadDecision}
            onCancel={handleCancelDocumentUpload}
          />
        )}
      </AnimatePresence>

      {/* Processing Indicator */}
      <AnimatePresence>
        {isProcessingDocuments && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-400"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <FileText size={16} />
            </motion.div>
            <span>Processing documents...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Typing Indicators */}
      <div className="flex items-center justify-between text-xs text-white/50" id="chat-input-help">
        <span>
          {isListening 
            ? "Voice input active - click microphone to stop"
            : showKnowledgePrompt
            ? "Would you like to store your voice input?"
            : "Press Enter to send, Shift + Enter for new line"
          }
        </span>
        {message.length > 0 && (
          <span aria-live="polite" aria-atomic="true">{message.length} characters</span>
        )}
      </div>
    </div>
  );
};