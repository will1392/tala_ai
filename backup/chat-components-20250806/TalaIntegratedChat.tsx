import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Paperclip,
  Plus,
  History,
  Mic,
  MicOff,
  Plane,
  Sparkles,
  ArrowUp
} from 'lucide-react';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  mode?: 'travel' | 'marketing';
  sources?: Array<{
    title: string;
    type: string;
    score: number;
  }>;
}

// This component is designed to work within PremiumLayout
// It provides just the chat content that fits inside the existing app structure
export const TalaIntegratedChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMarketingMode, setIsMarketingMode] = useState(false); // Travel is default
  const [isRecording, setIsRecording] = useState(false);
  const [userName] = useState('Will');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
      mode: isMarketingMode ? 'marketing' : 'travel'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`http://localhost:3001/api/chat/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-1'
        },
        body: JSON.stringify({
          message: input,
          mode: isMarketingMode ? 'cmo' : 'travel',
          conversationId: `conv-${Date.now()}`,
          searchKnowledge: !isMarketingMode
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      
      // Process the response to handle markdown
      let processedResponse = data.response;
      processedResponse = processedResponse.replace(/\*\*([^*]+)\*\*/g, '$1');
      processedResponse = processedResponse.replace(/^### (.+)$/gm, '\n$1\n');
      processedResponse = processedResponse.replace(/^## (.+)$/gm, '\n$1\n');
      processedResponse = processedResponse.replace(/^# (.+)$/gm, '\n$1\n');
      processedResponse = processedResponse.replace(/^- /gm, '• ');
      processedResponse = processedResponse.replace(/\n{3,}/g, '\n\n');
      processedResponse = processedResponse.trim();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: processedResponse,
        sender: 'assistant',
        timestamp: new Date(),
        sources: data.sources || []
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoiceRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast.success('Voice recording started');
    } else {
      toast.success('Voice recording stopped');
    }
  };

  const startNewChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with History and New Chat */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => {/* Handle history */}}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#1a1f2e] hover:bg-white/10 rounded-lg transition-colors"
        >
          <History className="w-4 h-4" />
          <span>History</span>
        </button>
        <button
          onClick={startNewChat}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#0fc6c6] hover:bg-[#0fc6c6]/10 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New chat</span>
        </button>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              {/* Icon */}
              <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0fc6c6] to-[#0a9999]">
                <Plane className="w-8 h-8 text-white" />
              </div>
              
              {/* Welcome Text */}
              <h1 className="text-3xl font-light mb-2 text-white">
                Where would you like to go, {userName}?
              </h1>
              
              <p className="text-gray-400">
                I can help you plan trips, find flights, and explore destinations
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-4 pb-4">
              {messages.map((message) => (
                <div key={message.id} className="flex gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {message.sender === 'user' ? (
                      <div className="w-8 h-8 rounded-lg bg-[#0fc6c6]/20 flex items-center justify-center text-[#0fc6c6] text-sm font-medium">
                        {userName[0]}
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0fc6c6] to-[#0a9999] flex items-center justify-center">
                        <Plane className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="text-gray-200 leading-relaxed">
                      {message.content.split('\n').map((paragraph, idx) => {
                        if (!paragraph.trim()) return null;
                        
                        if (paragraph.startsWith('• ')) {
                          return (
                            <div key={idx} className="flex gap-2 my-1">
                              <span className="text-[#0fc6c6]">•</span>
                              <span>{paragraph.substring(2)}</span>
                            </div>
                          );
                        }
                        
                        return (
                          <p key={idx} className="my-2">
                            {paragraph}
                          </p>
                        );
                      })}
                    </div>
                    
                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.sources.map((source, idx) => (
                          <div 
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-xs text-gray-400"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0fc6c6]" />
                            <span>{source.title}</span>
                            <span className="text-gray-500">({Math.round(source.score * 100)}%)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0fc6c6] to-[#0a9999] flex items-center justify-center">
                    <Plane className="w-4 h-4 text-white animate-pulse" />
                  </div>
                  <div className="flex items-center gap-1 pt-2">
                    <div className="w-2 h-2 bg-[#0fc6c6]/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-[#0fc6c6]/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-[#0fc6c6]/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 pt-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Where would you like to travel? Ask me about destinations, flights, or activities..."
              className={cn(
                "w-full bg-[#1a1f2e] text-white rounded-[2rem]",
                "pl-6 pr-40 py-4 resize-none",
                "border border-gray-700 focus:border-[#0fc6c6]/50",
                "focus:outline-none focus:ring-1 focus:ring-[#0fc6c6]/50",
                "placeholder-gray-500",
                "h-[56px] overflow-hidden",
                "text-base"
              )}
              rows={1}
            />
            
            {/* Controls */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              {/* Attachment */}
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Paperclip className="w-4 h-4 text-gray-500" />
              </button>

              {/* Voice */}
              <button 
                onClick={toggleVoiceRecording}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isRecording 
                    ? "bg-red-500/20 text-red-400" 
                    : "hover:bg-white/10 text-gray-500"
                )}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Mode Toggle - Travel only for now */}
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0fc6c6] text-white rounded-lg text-sm font-medium"
              >
                <Plane className="w-3.5 h-3.5" />
                Travel
              </button>

              {/* Send */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  input.trim() && !isLoading
                    ? "bg-[#0fc6c6] hover:bg-[#0a9999] text-white"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                )}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};