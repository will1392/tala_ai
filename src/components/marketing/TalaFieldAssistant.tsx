/**
 * TalaFieldAssistant - AI-powered help for filling out form fields
 * Provides contextual assistance from Tala in marketing mode
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  X, 
  Send, 
  Check, 
  Copy,
  MessageCircle,
  Loader2
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Textarea } from '../shared/Textarea';
import { Badge } from '../shared/Badge';

interface TalaFieldAssistantProps {
  fieldId: string;
  fieldLabel: string;
  fieldType: 'text' | 'textarea' | 'select' | 'radio';
  fieldOptions?: string[];
  currentValue?: string;
  context?: {
    sectionTitle: string;
    previousResponses?: Record<string, any>;
    businessInfo?: any;
  };
  onApplySuggestion: (value: string) => void;
  brandId: string;
}

export function TalaFieldAssistant({
  fieldId,
  fieldLabel,
  fieldType,
  fieldOptions,
  currentValue,
  context,
  onApplySuggestion,
  brandId
}: TalaFieldAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Send initial context to Tala
      sendInitialContext();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendInitialContext = async () => {
    let contextMessage = '';
    
    if (fieldType === 'select' && fieldOptions) {
      contextMessage = `I'm filling out a direct mail consultation form and need help with the "${fieldLabel}" field.\n\n` +
        `Available options: ${fieldOptions.join(', ')}\n\n` +
        `Which option should I choose for my travel agency? Please explain what each option means and suggest the best one for a typical travel agency.\n\n` +
        `Important: End your response with a clear suggestion in this format: "I suggest using: [option name]"`;
    } else if (fieldType === 'textarea') {
      contextMessage = `I'm filling out a direct mail consultation form and need help writing a response for: "${fieldLabel}"\n\n` +
        `Please provide a well-written example response that I can use or customize for my travel agency.\n\n` +
        `Important: Include a specific suggestion in this format: "I suggest using: [your suggested text]"`;
    } else {
      contextMessage = `I need help filling out the "${fieldLabel}" field in my direct mail consultation.\n\n` +
        `${currentValue ? `Current value: "${currentValue}"` : 'The field is currently empty.'}\n\n` +
        `Please help me understand what to put in this field and provide a specific suggestion.`;
    }

    await sendMessage(contextMessage, true);
  };

  const sendMessage = async (message: string, isInitial = false) => {
    if (!message.trim() && !isInitial) return;

    const userMessage = { role: 'user' as const, content: message };
    if (!isInitial) {
      setMessages(prev => [...prev, userMessage]);
    }
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-brand-id': brandId
        },
        body: JSON.stringify({
          message: message,
          mode: 'marketing',
          context: {
            task: 'field_assistance',
            fieldId,
            fieldLabel,
            fieldType,
            fieldOptions,
            currentValue,
            sectionContext: context
          },
          conversationId: conversationId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Tala');
      }

      const data = await response.json();
      
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage = {
        role: 'assistant' as const,
        content: data.response
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Extract suggestion if Tala provided one
      // First check if suggestion is in metadata
      if (data.metadata?.suggestion) {
        setSuggestion(data.metadata.suggestion);
      } else {
        // Otherwise try to extract from response text
        extractSuggestion(data.response);
      }

    } catch (error) {
      console.error('Error getting help from Tala:', error);
      console.error('Full error details:', {
        message: error.message,
        response: error.response,
        data: error.data
      });
      
      // Try to get more specific error message
      let errorMessage = 'I apologize, but I encountered an error. Please try again or contact support.';
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = `Error: ${error.response.data.error}`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const extractSuggestion = (response: string) => {
    // Look for suggestion patterns in Tala's response
    const suggestionPatterns = [
      /I suggest using:\s*["']?([^"'\n]+)["']?/i,
      /suggested (?:response|answer|text):\s*["']?([^"'\n]+)["']?/i,
      /I (?:suggest|recommend) (?:using|writing):\s*["']?([^"'\n]+)["']?/i,
      /(?:Try|Use|Consider):\s*["']?([^"'\n]+)["']?/i,
      /Here's what you could (?:write|use):\s*["']?([^"'\n]+)["']?/i,
      /["']([^"']+)["']\s*(?:would work well|is a good option|would be appropriate)/i
    ];

    for (const pattern of suggestionPatterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        setSuggestion(match[1].trim());
        return;
      }
    }

    // For select fields, look for option recommendations
    if (fieldType === 'select' && fieldOptions) {
      // Check if any option is mentioned with positive context
      for (const option of fieldOptions) {
        const optionRegex = new RegExp(`(?:suggest|recommend|choose|select|pick).*?${option}`, 'i');
        if (response.match(optionRegex)) {
          setSuggestion(option);
          return;
        }
      }
      
      // Check if an option appears after "I suggest" or similar phrases
      const suggestRegex = new RegExp(`I suggest.*?(${fieldOptions.join('|')})`, 'i');
      const match = response.match(suggestRegex);
      if (match && match[1]) {
        setSuggestion(match[1]);
      }
    }
  };

  const handleApplySuggestion = () => {
    if (suggestion) {
      onApplySuggestion(suggestion);
      setIsOpen(false);
      // Reset for next use
      setMessages([]);
      setSuggestion(null);
      setConversationId(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Help Button */}
      <Button
        onClick={() => setIsOpen(true)}
        variant="ghost"
        size="sm"
        className="ml-2 text-primary hover:text-primary/80"
        title={`Get help from Tala for ${fieldLabel}`}
      >
        <Sparkles className="w-4 h-4 mr-1" />
        Ask Tala
      </Button>

      {/* Assistant Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl h-[600px] flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Tala Marketing Assistant</h3>
                    <p className="text-sm text-gray-600">Help with: {fieldLabel}</p>
                  </div>
                </div>
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !isLoading && (
                  <div className="text-center text-gray-500 mt-8">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Tala is ready to help you with this field.</p>
                    <p className="text-sm mt-1">Just ask your question!</p>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggestion Card */}
              {suggestion && (
                <div className="mx-4 mb-4">
                  <Card className="p-4 bg-green-50 border-green-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Check className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-green-800">Suggested Response:</span>
                        </div>
                        <p className="text-gray-700 italic">"{suggestion}"</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(suggestion);
                          }}
                          variant="ghost"
                          size="sm"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={handleApplySuggestion}
                          variant="primary"
                          size="sm"
                        >
                          Use This
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask Tala for help..."
                    className="flex-1 resize-none"
                    rows={2}
                  />
                  <Button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isLoading}
                    variant="primary"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}