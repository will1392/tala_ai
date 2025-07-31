/**
 * Mode Announcements Hook
 * 
 * Provides announcement messages when switching between modes
 */

import { useEffect, useRef } from 'react';
import { useMode } from './useMode';

interface ModeAnnouncement {
  title: string;
  description: string;
  features: string[];
  icon: string;
}

const modeAnnouncements: Record<string, ModeAnnouncement> = {
  travel: {
    title: "Welcome to Travel Mode!",
    description: "I'm here to help you plan your perfect trip and handle all your travel needs.",
    features: [
      "✈️ Flight and hotel bookings",
      "📄 Visa requirements and documentation",
      "🗺️ Destination guides and recommendations",
      "💼 Travel insurance and policies",
      "🎒 Packing lists and travel tips"
    ],
    icon: "✈️"
  },
  cmo: {
    title: "Welcome to Marketing Mode!",
    description: "Let's grow your business with smart marketing strategies across all channels.",
    features: [
      "🎯 SEO optimization and keyword research",
      "📧 Email campaign creation and testing",
      "📱 Social media content and strategy",
      "💰 Paid advertising campaigns",
      "📮 Direct mail marketing"
    ],
    icon: "📈"
  }
};

const subModeAnnouncements: Record<string, ModeAnnouncement> = {
  seo: {
    title: "SEO Mode Activated",
    description: "Let's improve your search engine rankings and organic traffic.",
    features: [
      "🔍 Keyword research and analysis",
      "📝 Title tag and meta description optimization",
      "🔗 Link building strategies",
      "📊 SEO performance tracking",
      "🏆 Competitor analysis"
    ],
    icon: "🎯"
  },
  email: {
    title: "Email Marketing Mode",
    description: "Create compelling email campaigns that convert.",
    features: [
      "✉️ Subject line optimization",
      "🎨 Email template design",
      "📈 A/B testing strategies",
      "📊 Campaign analytics",
      "🔄 Automation workflows"
    ],
    icon: "📧"
  },
  social: {
    title: "Social Media Mode",
    description: "Build your brand and engage your audience on social platforms.",
    features: [
      "📱 Content calendar planning",
      "#️⃣ Hashtag research and optimization",
      "📸 Visual content strategies",
      "💬 Engagement tactics",
      "📊 Social analytics"
    ],
    icon: "🌐"
  },
  ads: {
    title: "Paid Advertising Mode",
    description: "Maximize your ROI with targeted advertising campaigns.",
    features: [
      "🎯 Audience targeting",
      "✍️ Ad copy optimization",
      "💰 Budget management",
      "📊 Performance tracking",
      "🔄 Campaign optimization"
    ],
    icon: "💸"
  },
  direct_mail: {
    title: "Direct Mail Mode",
    description: "Connect with customers through personalized physical mail.",
    features: [
      "📬 Mailing list management",
      "🎨 Design templates",
      "🎯 Geographic targeting",
      "📊 Response tracking",
      "💌 Personalization strategies"
    ],
    icon: "📮"
  }
};

export interface UseModeAnnouncementsReturn {
  getAnnouncement: (mode: string, subMode?: string | null) => ModeAnnouncement | null;
  formatAnnouncementMessage: (announcement: ModeAnnouncement) => string;
}

export const useModeAnnouncements = (): UseModeAnnouncementsReturn => {
  const { mode, subMode } = useMode();
  const previousModeRef = useRef<string | null>(null);
  const previousSubModeRef = useRef<string | null>(null);

  useEffect(() => {
    // Track mode changes for future use
    previousModeRef.current = mode;
    previousSubModeRef.current = subMode;
  }, [mode, subMode]);

  const getAnnouncement = (targetMode: string, targetSubMode?: string | null): ModeAnnouncement | null => {
    // If switching to a sub-mode, show sub-mode announcement
    if (targetMode === 'cmo' && targetSubMode && subModeAnnouncements[targetSubMode]) {
      return subModeAnnouncements[targetSubMode];
    }
    
    // Otherwise show main mode announcement
    return modeAnnouncements[targetMode] || null;
  };

  const formatAnnouncementMessage = (announcement: ModeAnnouncement): string => {
    const features = announcement.features.join('\n');
    return `${announcement.icon} ${announcement.title}\n\n${announcement.description}\n\n${features}`;
  };

  return {
    getAnnouncement,
    formatAnnouncementMessage
  };
};