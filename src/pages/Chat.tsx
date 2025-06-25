import { useState } from 'react';
import { motion } from 'framer-motion';
import { MoreVertical } from 'lucide-react';
import { GlassCard } from '../components/layout/GlassCard';
import { Button } from '../components/shared/Button';
import { ChatMessage } from '../components/chat/ChatMessage';
import { ChatInput } from '../components/chat/ChatInput';

export const Chat = () => {
  const [messages, setMessages] = useState([
    {
      id: '1',
      content: 'Hello! I\'m Tala, your AI travel assistant. How can I help you today?',
      sender: 'tala' as const,
      timestamp: new Date(),
    },
    {
      id: '2',
      content: 'I need information about visa requirements for Japan.',
      sender: 'user' as const,
      timestamp: new Date(),
    },
    {
      id: '3',
      content: 'I\'d be happy to help you with Japan visa requirements! Based on your nationality and travel purpose, here\'s what you\'ll need:\n\n1. Valid passport (6+ months validity)\n2. Visa application form\n3. Recent passport photo\n4. Proof of accommodation\n5. Return flight tickets\n6. Bank statements\n\nThe processing time is typically 5-7 business days. Would you like me to provide more specific details based on your nationality?',
      sender: 'tala' as const,
      timestamp: new Date(),
      sources: [
        { title: 'Japan Visa Requirements 2024', type: 'document' as const },
        { title: 'Embassy of Japan Guidelines', type: 'website' as const }
      ]
    }
  ]);

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Chat Header */}
          <div className="glass-dark p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Chat with Tala</h2>
                <p className="text-sm text-white/60">AI-powered travel assistance</p>
              </div>
              <Button variant="ghost" size="sm" className="p-2">
                <MoreVertical size={20} />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <ChatMessage message={message} />
              </motion.div>
            ))}
          </div>

          {/* Input */}
          <ChatInput onSend={(content) => {
            setMessages([...messages, {
              id: Date.now().toString(),
              content,
              sender: 'user' as const,
              timestamp: new Date(),
            }]);
          }} />
        </GlassCard>
      </div>

      {/* Sidebar */}
      <div className="w-80 space-y-6">
        {/* Quick Actions */}
        <GlassCard>
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              'Check visa requirements',
              'Search for flights',
              'Find travel insurance',
              'Get packing list',
            ].map((action) => (
              <button
                key={action}
                className="w-full text-left glass-button rounded-lg px-3 py-2 text-sm hover:bg-white/20"
              >
                {action}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Recent Topics */}
        <GlassCard>
          <h3 className="font-semibold mb-4">Recent Topics</h3>
          <div className="space-y-3">
            {[
              { topic: 'Japan Visa', time: '10 min ago' },
              { topic: 'Flight to Tokyo', time: '1 hour ago' },
              { topic: 'Travel Insurance', time: 'Yesterday' },
            ].map((item) => (
              <div key={item.topic} className="flex items-center justify-between text-sm">
                <span>{item.topic}</span>
                <span className="text-white/50">{item.time}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};