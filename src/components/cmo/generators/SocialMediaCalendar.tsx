import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Hash, Image, Video, FileText, Sparkles, Download, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { useContentGeneration } from '../../../hooks/useContentGeneration';

interface SocialMediaCalendarProps {
  onGenerate?: (calendar: SocialCalendar) => void;
  initialData?: any;
  context?: string;
}

interface SocialCalendar {
  id: string;
  name: string;
  startDate: string;
  posts: SocialPost[];
  settings: CalendarSettings;
}

interface SocialPost {
  id: string;
  date: string;
  time: string;
  platform: Platform[];
  content: string;
  media: MediaType;
  hashtags: string[];
  campaign?: string;
  status: 'draft' | 'scheduled' | 'published';
  variations?: PostVariation[];
}

interface PostVariation {
  platform: Platform;
  content: string;
  characterCount: number;
}

interface CalendarSettings {
  platforms: Platform[];
  postingFrequency: PostingFrequency;
  contentMix: ContentMix;
  campaigns: string[];
}

type Platform = 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok';
type MediaType = 'text' | 'image' | 'video' | 'carousel' | 'story';
type PostingFrequency = 'daily' | 'weekdays' | 'custom';

interface ContentMix {
  educational: number;
  promotional: number;
  engaging: number;
  userGenerated: number;
}

const PLATFORM_CONFIG = {
  instagram: { color: 'bg-pink-500', icon: '📷', charLimit: 2200 },
  facebook: { color: 'bg-blue-600', icon: '👍', charLimit: 63206 },
  twitter: { color: 'bg-sky-500', icon: '🐦', charLimit: 280 },
  linkedin: { color: 'bg-blue-700', icon: '💼', charLimit: 3000 },
  tiktok: { color: 'bg-black', icon: '🎵', charLimit: 2200 }
};

const CONTENT_THEMES = [
  { id: 'monday-motivation', name: 'Monday Motivation', day: 1 },
  { id: 'tip-tuesday', name: 'Tip Tuesday', day: 2 },
  { id: 'wednesday-wisdom', name: 'Wednesday Wisdom', day: 3 },
  { id: 'throwback-thursday', name: 'Throwback Thursday', day: 4 },
  { id: 'feature-friday', name: 'Feature Friday', day: 5 }
];

export const SocialMediaCalendar: React.FC<SocialMediaCalendarProps> = ({
  onGenerate,
  initialData,
  context
}) => {
  const { generateContent, suggestHashtags, optimizeForPlatform } = useContentGeneration();
  
  const [calendar, setCalendar] = useState<SocialCalendar>({
    id: Date.now().toString(),
    name: '30-Day Social Media Calendar',
    startDate: new Date().toISOString().split('T')[0],
    posts: [],
    settings: {
      platforms: ['instagram', 'facebook', 'twitter'],
      postingFrequency: 'weekdays',
      contentMix: {
        educational: 40,
        promotional: 20,
        engaging: 30,
        userGenerated: 10
      },
      campaigns: []
    }
  });

  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [generatingPosts, setGeneratingPosts] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Initialize with data if provided
  useEffect(() => {
    if (initialData) {
      setCalendar(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  // Generate calendar posts
  const generateCalendarPosts = async () => {
    setGeneratingPosts(true);
    const posts: SocialPost[] = [];
    const startDate = new Date(calendar.startDate);
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dayOfWeek = date.getDay();
      
      // Skip weekends if frequency is weekdays
      if (calendar.settings.postingFrequency === 'weekdays' && (dayOfWeek === 0 || dayOfWeek === 6)) {
        continue;
      }
      
      // Determine content type based on mix
      const contentType = getContentType(posts.length);
      const theme = CONTENT_THEMES.find(t => t.day === dayOfWeek);
      
      const post: SocialPost = {
        id: `post-${i}`,
        date: date.toISOString().split('T')[0],
        time: '10:00',
        platform: calendar.settings.platforms,
        content: '',
        media: getMediaType(contentType),
        hashtags: [],
        campaign: theme?.name,
        status: 'draft'
      };
      
      posts.push(post);
    }
    
    setCalendar(prev => ({ ...prev, posts }));
    setGeneratingPosts(false);
  };

  // Generate content for a specific post
  const generatePostContent = async (postId: string) => {
    const post = calendar.posts.find(p => p.id === postId);
    if (!post) return;
    
    const prompt = `
      Generate social media post for:
      Date: ${post.date}
      Theme: ${post.campaign || 'General'}
      Platforms: ${post.platform.join(', ')}
      Content Type: ${post.media}
    `;
    
    const generated = await generateContent('social', prompt);
    const hashtags = await suggestHashtags(generated.content, post.platform[0]);
    
    // Generate platform-specific variations
    const variations: PostVariation[] = [];
    for (const platform of post.platform) {
      const optimized = await optimizeForPlatform(generated.content, platform);
      variations.push({
        platform,
        content: optimized,
        characterCount: optimized.length
      });
    }
    
    updatePost(postId, {
      content: generated.content,
      hashtags,
      variations
    });
  };

  // Update post
  const updatePost = (postId: string, updates: Partial<SocialPost>) => {
    setCalendar(prev => ({
      ...prev,
      posts: prev.posts.map(post => 
        post.id === postId ? { ...post, ...updates } : post
      )
    }));
  };

  // Get content type based on mix
  const getContentType = (index: number): keyof ContentMix => {
    const total = Object.values(calendar.settings.contentMix).reduce((a, b) => a + b, 0);
    const normalized = index % (total / 10);
    
    if (normalized < calendar.settings.contentMix.educational / 10) return 'educational';
    if (normalized < (calendar.settings.contentMix.educational + calendar.settings.contentMix.promotional) / 10) return 'promotional';
    if (normalized < (calendar.settings.contentMix.educational + calendar.settings.contentMix.promotional + calendar.settings.contentMix.engaging) / 10) return 'engaging';
    return 'userGenerated';
  };

  // Get media type based on content type
  const getMediaType = (contentType: keyof ContentMix): MediaType => {
    switch (contentType) {
      case 'educational': return Math.random() > 0.5 ? 'carousel' : 'image';
      case 'promotional': return 'image';
      case 'engaging': return Math.random() > 0.5 ? 'video' : 'story';
      case 'userGenerated': return 'image';
      default: return 'text';
    }
  };

  // Get week dates
  const getWeekDates = (weekOffset: number) => {
    const startDate = new Date(calendar.startDate);
    startDate.setDate(startDate.getDate() + weekOffset * 7);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      weekDates.push(date);
    }
    
    return weekDates;
  };

  // Export calendar
  const exportCalendar = (format: 'csv' | 'json' | 'ics') => {
    let content = '';
    const filename = `social-calendar-${calendar.startDate}`;
    
    switch (format) {
      case 'csv':
        content = 'Date,Time,Platform,Content,Hashtags,Media Type,Status\n';
        calendar.posts.forEach(post => {
          content += `"${post.date}","${post.time}","${post.platform.join(', ')}","${post.content}","${post.hashtags.join(' ')}","${post.media}","${post.status}"\n`;
        });
        break;
      case 'json':
        content = JSON.stringify(calendar, null, 2);
        break;
      case 'ics':
        content = 'BEGIN:VCALENDAR\nVERSION:2.0\n';
        calendar.posts.forEach(post => {
          const date = new Date(`${post.date}T${post.time}`);
          content += `BEGIN:VEVENT\nDTSTART:${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\nSUMMARY:Social Media Post - ${post.platform.join(', ')}\nDESCRIPTION:${post.content}\nEND:VEVENT\n`;
        });
        content += 'END:VCALENDAR';
        break;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calendar view
  const renderCalendarView = () => {
    const weekDates = getWeekDates(currentWeek);
    const weekPosts = calendar.posts.filter(post => {
      const postDate = new Date(post.date);
      return postDate >= weekDates[0] && postDate <= weekDates[6];
    });
    
    return (
      <div className="space-y-4">
        {/* Week navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentWeek(currentWeek - 1)}
            disabled={currentWeek === 0}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="font-medium">
            Week {currentWeek + 1}: {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
          </h3>
          <button
            onClick={() => setCurrentWeek(currentWeek + 1)}
            disabled={currentWeek >= 3}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 p-2">
              {day}
            </div>
          ))}
          
          {weekDates.map((date, index) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayPosts = weekPosts.filter(p => p.date === dateStr);
            
            return (
              <div
                key={index}
                className={cn(
                  "min-h-[120px] p-2 border border-gray-200 dark:border-gray-700 rounded-lg",
                  "hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer",
                  date.getDay() === 0 || date.getDay() === 6 ? "bg-gray-50 dark:bg-gray-800" : ""
                )}
                onClick={() => setSelectedPost(dayPosts[0]?.id || null)}
              >
                <div className="text-sm font-medium mb-1">{date.getDate()}</div>
                {dayPosts.map(post => (
                  <div key={post.id} className="space-y-1">
                    <div className="flex gap-1">
                      {post.platform.map(platform => (
                        <div
                          key={platform}
                          className={cn("w-6 h-6 rounded flex items-center justify-center text-white text-xs", PLATFORM_CONFIG[platform].color)}
                        >
                          {PLATFORM_CONFIG[platform].icon}
                        </div>
                      ))}
                    </div>
                    {post.content && (
                      <div className="text-xs text-gray-600 truncate">
                        {post.content.substring(0, 30)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // List view
  const renderListView = () => (
    <div className="space-y-4">
      {calendar.posts.map(post => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">{new Date(post.date).toLocaleDateString()}</span>
                <span className="text-gray-500">{post.time}</span>
                {post.campaign && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                    {post.campaign}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {post.platform.map(platform => (
                  <div
                    key={platform}
                    className={cn("px-3 py-1 rounded-full text-white text-sm", PLATFORM_CONFIG[platform].color)}
                  >
                    {platform}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={post.status}
                onChange={(e) => updatePost(post.id, { status: e.target.value as SocialPost['status'] })}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Content</label>
              <textarea
                value={post.content}
                onChange={(e) => updatePost(post.id, { content: e.target.value })}
                placeholder="Write your post content..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
              />
            </div>
            
            {post.variations && post.variations.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {post.variations.map(variation => (
                  <div key={variation.platform} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{variation.platform}</span>
                      <span className={cn(
                        "text-xs",
                        variation.characterCount > PLATFORM_CONFIG[variation.platform].charLimit
                          ? "text-red-600"
                          : "text-green-600"
                      )}>
                        {variation.characterCount}/{PLATFORM_CONFIG[variation.platform].charLimit}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {variation.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => generatePostContent(post.id)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generate Content
              </button>
              <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                <Hash className="w-4 h-4" />
              </button>
              <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                <Image className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-6">Social Media Calendar</h2>
        
        {/* Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              value={calendar.startDate}
              onChange={(e) => setCalendar(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Posting Frequency</label>
            <select
              value={calendar.settings.postingFrequency}
              onChange={(e) => setCalendar(prev => ({
                ...prev,
                settings: { ...prev.settings, postingFrequency: e.target.value as PostingFrequency }
              }))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays Only</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Platforms</label>
            <div className="flex gap-2">
              {Object.keys(PLATFORM_CONFIG).map(platform => (
                <label key={platform} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={calendar.settings.platforms.includes(platform as Platform)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCalendar(prev => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            platforms: [...prev.settings.platforms, platform as Platform]
                          }
                        }));
                      } else {
                        setCalendar(prev => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            platforms: prev.settings.platforms.filter(p => p !== platform)
                          }
                        }));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{platform}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        
        {/* Content Mix */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Content Mix</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(calendar.settings.contentMix).map(([type, percentage]) => (
              <div key={type}>
                <label className="text-sm capitalize">{type} ({percentage}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={percentage}
                  onChange={(e) => setCalendar(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      contentMix: {
                        ...prev.settings.contentMix,
                        [type]: parseInt(e.target.value)
                      }
                    }
                  }))}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                "px-4 py-2 rounded-lg",
                viewMode === 'calendar'
                  ? "bg-primary text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              )}
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "px-4 py-2 rounded-lg",
                viewMode === 'list'
                  ? "bg-primary text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              )}
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={generateCalendarPosts}
            disabled={generatingPosts}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {generatingPosts ? 'Generating...' : 'Generate Calendar'}
          </button>
        </div>
      </div>
      
      {/* Calendar/List View */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        {viewMode === 'calendar' ? renderCalendarView() : renderListView()}
      </div>
      
      {/* Export Actions */}
      {calendar.posts.length > 0 && (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => exportCalendar('csv')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => exportCalendar('ics')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Calendar
          </button>
        </div>
      )}
    </div>
  );
};