import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, X, Search, MessageCircle, 
  Book, Video, ChevronRight, ExternalLink,
  Sparkles, Send, Loader2, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { DebouncedInput } from './VirtualizedList';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  helpful?: number;
  notHelpful?: number;
}

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  url: string;
  category: string;
}

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  readTime: string;
  lastUpdated: string;
}

// Help button component
export const HelpButton: React.FC<{
  context?: string;
  className?: string;
}> = ({ context, className }) => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowHelp(true)}
        className={cn(
          "p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
          className
        )}
        aria-label="Help"
      >
        <HelpCircle className="w-5 h-5 text-gray-500" />
      </button>

      <AnimatePresence>
        {showHelp && (
          <HelpModal
            context={context}
            onClose={() => setShowHelp(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// Main help modal
const HelpModal: React.FC<{
  context?: string;
  onClose: () => void;
}> = ({ context, onClose }) => {
  const [activeTab, setActiveTab] = useState<'faq' | 'videos' | 'articles' | 'chat'>('faq');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'faq', label: 'FAQ', icon: Book },
    { id: 'videos', label: 'Videos', icon: Video },
    { id: 'articles', label: 'Articles', icon: Book },
    { id: 'chat', label: 'Support Chat', icon: MessageCircle }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-purple-600 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Help Center</h2>
                <p className="text-white/80">
                  {context ? `Help for ${context}` : 'How can we help you?'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
            <DebouncedInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search for help..."
              className="w-full pl-10 pr-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 transition-colors",
                    activeTab === tab.id
                      ? "text-primary border-b-2 border-primary"
                      : "text-gray-600 hover:text-gray-800"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          {activeTab === 'faq' && <FAQSection searchQuery={searchQuery} context={context} />}
          {activeTab === 'videos' && <VideoSection searchQuery={searchQuery} />}
          {activeTab === 'articles' && <ArticleSection searchQuery={searchQuery} />}
          {activeTab === 'chat' && <ChatSection context={context} />}
        </div>
      </motion.div>
    </motion.div>
  );
};

// FAQ Section
const FAQSection: React.FC<{
  searchQuery: string;
  context?: string;
}> = ({ searchQuery, context }) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Record<string, 'helpful' | 'not-helpful'>>({});

  const faqs: FAQItem[] = [
    {
      id: '1',
      question: 'How do I switch to CMO Mode?',
      answer: 'Click the toggle switch in the top navigation bar or use the keyboard shortcut ⌘M (Ctrl+M on Windows). CMO Mode activates marketing-specific features and context.',
      category: 'Getting Started',
      keywords: ['switch', 'toggle', 'cmo mode', 'activate']
    },
    {
      id: '2',
      question: 'What marketing channels are supported?',
      answer: 'CMO Mode supports SEO, Email Marketing, Social Media, and Direct Mail. Each channel has specialized tools and workflows designed for that specific marketing area.',
      category: 'Features',
      keywords: ['channels', 'seo', 'email', 'social', 'direct mail']
    },
    {
      id: '3',
      question: 'How do I access marketing tools?',
      answer: 'Press ⌘K (Ctrl+K on Windows) to open the quick search, or click the Tools button in the navigation. You can also ask for specific tools in the chat.',
      category: 'Tools',
      keywords: ['tools', 'access', 'search', 'keyboard shortcut']
    },
    {
      id: '4',
      question: 'Can I save and reuse marketing templates?',
      answer: 'Yes! Create templates for emails, social posts, and campaigns. Access them through the Templates section in your tools or by typing "templates" in the chat.',
      category: 'Templates',
      keywords: ['templates', 'save', 'reuse', 'campaigns']
    },
    {
      id: '5',
      question: 'How do I track campaign performance?',
      answer: 'The Dashboard provides real-time analytics and performance metrics. You can also ask for specific reports like "Show me email campaign performance" in the chat.',
      category: 'Analytics',
      keywords: ['performance', 'analytics', 'tracking', 'metrics', 'dashboard']
    },
    {
      id: '6',
      question: 'What\'s the difference between CMO Mode and regular chat?',
      answer: 'CMO Mode provides marketing-specific context, specialized tools, channel recognition, and workflow automation. Regular chat is general-purpose without marketing focus.',
      category: 'Features',
      keywords: ['difference', 'cmo mode', 'regular', 'features']
    }
  ];

  const filteredFAQs = faqs.filter(faq => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query) ||
      faq.keywords.some(keyword => keyword.includes(query))
    );
  });

  const toggleItem = (id: string) => {
    setExpandedItems(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleFeedback = (id: string, type: 'helpful' | 'not-helpful') => {
    setFeedback(prev => ({ ...prev, [id]: type }));
    // In production, send feedback to analytics
  };

  const categories = [...new Set(faqs.map(faq => faq.category))];

  return (
    <div className="space-y-6">
      {categories.map(category => {
        const categoryFAQs = filteredFAQs.filter(faq => faq.category === category);
        if (categoryFAQs.length === 0) return null;

        return (
          <div key={category}>
            <h3 className="text-lg font-semibold mb-3">{category}</h3>
            <div className="space-y-2">
              {categoryFAQs.map(faq => (
                <motion.div
                  key={faq.id}
                  layout
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleItem(faq.id)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="font-medium">{faq.question}</span>
                    <ChevronRight
                      className={cn(
                        "w-5 h-5 text-gray-400 transition-transform",
                        expandedItems.includes(faq.id) && "rotate-90"
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {expandedItems.includes(faq.id) && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-gray-600 dark:text-gray-400 mb-3">
                            {faq.answer}
                          </p>
                          
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-500">Was this helpful?</span>
                            <button
                              onClick={() => handleFeedback(faq.id, 'helpful')}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1 rounded-lg transition-colors",
                                feedback[faq.id] === 'helpful'
                                  ? "bg-green-100 text-green-700"
                                  : "hover:bg-gray-200 dark:hover:bg-gray-600"
                              )}
                            >
                              <ThumbsUp className="w-4 h-4" />
                              <span>Yes</span>
                            </button>
                            <button
                              onClick={() => handleFeedback(faq.id, 'not-helpful')}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1 rounded-lg transition-colors",
                                feedback[faq.id] === 'not-helpful'
                                  ? "bg-red-100 text-red-700"
                                  : "hover:bg-gray-200 dark:hover:bg-gray-600"
                              )}
                            >
                              <ThumbsDown className="w-4 h-4" />
                              <span>No</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}

      {filteredFAQs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No FAQs found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

// Video Section
const VideoSection: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  const videos: VideoTutorial[] = [
    {
      id: '1',
      title: 'Getting Started with CMO Mode',
      description: 'Learn the basics of CMO Mode and how to activate marketing features',
      duration: '5:23',
      thumbnail: '/placeholder-video.jpg',
      url: '#',
      category: 'Getting Started'
    },
    {
      id: '2',
      title: 'Email Campaign Creation',
      description: 'Step-by-step guide to creating effective email campaigns',
      duration: '8:45',
      thumbnail: '/placeholder-video.jpg',
      url: '#',
      category: 'Email Marketing'
    },
    {
      id: '3',
      title: 'SEO Tools Walkthrough',
      description: 'Explore all SEO tools and learn how to optimize your content',
      duration: '12:30',
      thumbnail: '/placeholder-video.jpg',
      url: '#',
      category: 'SEO'
    },
    {
      id: '4',
      title: 'Social Media Automation',
      description: 'Set up automated social media workflows and scheduling',
      duration: '7:15',
      thumbnail: '/placeholder-video.jpg',
      url: '#',
      category: 'Social Media'
    }
  ];

  const filteredVideos = videos.filter(video => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      video.title.toLowerCase().includes(query) ||
      video.description.toLowerCase().includes(query) ||
      video.category.toLowerCase().includes(query)
    );
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {filteredVideos.map(video => (
        <motion.div
          key={video.id}
          whileHover={{ scale: 1.02 }}
          className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer"
        >
          <div className="aspect-video bg-gray-200 dark:bg-gray-600 relative">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                <Video className="w-8 h-8 text-primary" />
              </div>
            </div>
            <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {video.duration}
            </span>
          </div>
          
          <div className="p-4">
            <h4 className="font-semibold mb-1">{video.title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {video.description}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{video.category}</span>
              <button className="text-sm text-primary hover:underline flex items-center gap-1">
                Watch
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </motion.div>
      ))}

      {filteredVideos.length === 0 && (
        <div className="col-span-2 text-center py-8 text-gray-500">
          <p>No videos found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

// Article Section
const ArticleSection: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  const articles: HelpArticle[] = [
    {
      id: '1',
      title: 'Complete Guide to CMO Mode',
      content: 'Comprehensive guide covering all CMO Mode features...',
      category: 'Guides',
      readTime: '10 min',
      lastUpdated: '2024-01-15'
    },
    {
      id: '2',
      title: 'Email Marketing Best Practices',
      content: 'Learn the latest email marketing strategies...',
      category: 'Best Practices',
      readTime: '8 min',
      lastUpdated: '2024-01-10'
    },
    {
      id: '3',
      title: 'SEO Optimization Techniques',
      content: 'Advanced SEO techniques for better rankings...',
      category: 'SEO',
      readTime: '15 min',
      lastUpdated: '2024-01-08'
    }
  ];

  const filteredArticles = articles.filter(article => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      article.title.toLowerCase().includes(query) ||
      article.content.toLowerCase().includes(query) ||
      article.category.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      {filteredArticles.map(article => (
        <motion.div
          key={article.id}
          whileHover={{ x: 4 }}
          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary transition-colors cursor-pointer"
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-lg">{article.title}</h4>
            <span className="text-xs text-gray-500">{article.readTime} read</span>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {article.content}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{article.category}</span>
              <span>Updated {article.lastUpdated}</span>
            </div>
            <button className="text-sm text-primary hover:underline">
              Read More →
            </button>
          </div>
        </motion.div>
      ))}

      {filteredArticles.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No articles found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

// Chat Section
const ChatSection: React.FC<{ context?: string }> = ({ context }) => {
  const [messages, setMessages] = useState<Array<{
    id: string;
    type: 'user' | 'support';
    content: string;
    timestamp: Date;
  }>>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Welcome message
    setMessages([{
      id: '1',
      type: 'support',
      content: `Hi! I'm here to help you with CMO Mode. ${context ? `I see you're working with ${context}.` : ''} What can I help you with?`,
      timestamp: new Date()
    }]);
  }, [context]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate support response
    setTimeout(() => {
      const responses = [
        'I understand your question. Let me help you with that.',
        'That\'s a great question! Here\'s what you need to know...',
        'I can definitely help you with that. Let me explain...'
      ];

      const supportMessage = {
        id: (Date.now() + 1).toString(),
        type: 'support' as const,
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, supportMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[400px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.type === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                "max-w-[70%] rounded-lg px-4 py-2",
                message.type === 'user'
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-gray-700"
              )}
            >
              <p className="text-sm">{message.content}</p>
              <span className="text-xs opacity-70">
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-2 text-center">
        Support hours: Mon-Fri 9AM-6PM EST
      </p>
    </div>
  );
};

// Contextual help tooltip
export const ContextualHelp: React.FC<{
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}> = ({ content, placement = 'top', children }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "absolute z-50 px-3 py-2 text-sm bg-gray-800 text-white rounded-lg shadow-lg max-w-xs",
              placement === 'top' && "bottom-full left-1/2 -translate-x-1/2 mb-2",
              placement === 'bottom' && "top-full left-1/2 -translate-x-1/2 mt-2",
              placement === 'left' && "right-full top-1/2 -translate-y-1/2 mr-2",
              placement === 'right' && "left-full top-1/2 -translate-y-1/2 ml-2"
            )}
          >
            {content}
            <div
              className={cn(
                "absolute w-2 h-2 bg-gray-800 rotate-45",
                placement === 'top' && "top-full left-1/2 -translate-x-1/2 -mt-1",
                placement === 'bottom' && "bottom-full left-1/2 -translate-x-1/2 -mb-1",
                placement === 'left' && "left-full top-1/2 -translate-y-1/2 -ml-1",
                placement === 'right' && "right-full top-1/2 -translate-y-1/2 -mr-1"
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { HelpModal };
export default HelpButton;