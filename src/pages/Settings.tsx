import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Database,
  CreditCard,
  Users,
  Key,
  Save
} from 'lucide-react';
import { GlassCard } from '../components/layout/GlassCard';
import { Button } from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import { cn } from '../utils/cn';

const settingsSections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'language', label: 'Language', icon: Globe },
  { id: 'data', label: 'Data & Storage', icon: Database },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'api', label: 'API Keys', icon: Key },
];

export const Settings = () => {
  const [activeSection, setActiveSection] = useState('profile');
  const [settings, setSettings] = useState({
    // Profile
    agencyName: 'Wanderlust Travel Agency',
    email: 'admin@wanderlust.com',
    phone: '+1 (555) 123-4567',
    timezone: 'America/New_York',
    
    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    reminderFrequency: 'daily',
    
    // Appearance
    theme: 'dark',
    primaryColor: '#0fc6c6',
    compactMode: false,
    
    // Language
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
  });

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSettings settings={settings} setSettings={setSettings} />;
      case 'notifications':
        return <NotificationSettings settings={settings} setSettings={setSettings} />;
      case 'appearance':
        return <AppearanceSettings settings={settings} setSettings={setSettings} />;
      case 'security':
        return <SecuritySettings />;
      case 'team':
        return <TeamSettings />;
      case 'api':
        return <APISettings />;
      default:
        return <div>Section under construction</div>;
    }
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className="w-64">
        <GlassCard className="h-full p-4">
          <h2 className="text-xl font-semibold mb-4">Settings</h2>
          <nav className="space-y-1">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                  'hover:bg-white/10',
                  activeSection === section.id && 'bg-primary/20 text-primary'
                )}
              >
                <section.icon size={18} />
                <span>{section.label}</span>
              </button>
            ))}
          </nav>
        </GlassCard>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderSection()}
        </motion.div>
      </div>
    </div>
  );
};

// Profile Settings Component
const ProfileSettings = ({ settings, setSettings }: any) => {
  return (
    <div className="space-y-6">
      <GlassCard>
        <h3 className="text-lg font-semibold mb-6">Agency Profile</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Agency Name</label>
            <Input 
              value={settings.agencyName}
              onChange={(e) => setSettings({ ...settings, agencyName: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input 
              type="email"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Phone</label>
            <Input 
              type="tel"
              value={settings.phone}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Timezone</label>
            <select 
              className="glass-input w-full px-4 py-3 rounded-xl"
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button variant="primary" className="flex items-center gap-2">
            <Save size={18} />
            Save Changes
          </Button>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-lg font-semibold mb-6">Agency Logo</h3>
        
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center">
            <span className="text-3xl font-bold text-white">WT</span>
          </div>
          
          <div className="flex-1">
            <p className="text-sm text-white/60 mb-3">
              Upload your agency logo. Recommended size: 400x400px
            </p>
            <div className="flex gap-3">
              <Button variant="primary" size="sm">Upload New Logo</Button>
              <Button variant="ghost" size="sm">Remove</Button>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

// Notification Settings Component
const NotificationSettings = ({ settings, setSettings }: any) => {
  return (
    <div className="space-y-6">
      <GlassCard>
        <h3 className="text-lg font-semibold mb-6">Notification Preferences</h3>
        
        <div className="space-y-4">
          <ToggleOption
            label="Email Notifications"
            description="Receive updates and alerts via email"
            checked={settings.emailNotifications}
            onChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
          />
          
          <ToggleOption
            label="Push Notifications"
            description="Get instant notifications in your browser"
            checked={settings.pushNotifications}
            onChange={(checked) => setSettings({ ...settings, pushNotifications: checked })}
          />
          
          <ToggleOption
            label="SMS Notifications"
            description="Receive critical alerts via text message"
            checked={settings.smsNotifications}
            onChange={(checked) => setSettings({ ...settings, smsNotifications: checked })}
          />
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-lg font-semibold mb-6">Reminder Settings</h3>
        
        <div>
          <label className="block text-sm font-medium mb-2">Task Reminder Frequency</label>
          <select 
            className="glass-input w-full px-4 py-3 rounded-xl"
            value={settings.reminderFrequency}
            onChange={(e) => setSettings({ ...settings, reminderFrequency: e.target.value })}
          >
            <option value="hourly">Every Hour</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </GlassCard>
    </div>
  );
};

// Appearance Settings Component
const AppearanceSettings = ({ settings, setSettings }: any) => {
  const colors = [
    '#0fc6c6', // Current primary
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#10b981', // Emerald
  ];

  return (
    <div className="space-y-6">
      <GlassCard>
        <h3 className="text-lg font-semibold mb-6">Theme</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSettings({ ...settings, theme: 'light' })}
            className={cn(
              'glass rounded-xl p-4 text-left transition-all',
              settings.theme === 'light' ? 'ring-2 ring-primary' : 'hover:bg-white/10'
            )}
          >
            <div className="w-full h-20 bg-white rounded-lg mb-3" />
            <p className="font-medium">Light Theme</p>
            <p className="text-sm text-white/60">Clean and bright</p>
          </button>
          
          <button
            onClick={() => setSettings({ ...settings, theme: 'dark' })}
            className={cn(
              'glass rounded-xl p-4 text-left transition-all',
              settings.theme === 'dark' ? 'ring-2 ring-primary' : 'hover:bg-white/10'
            )}
          >
            <div className="w-full h-20 bg-secondary-900 rounded-lg mb-3" />
            <p className="font-medium">Dark Theme</p>
            <p className="text-sm text-white/60">Easy on the eyes</p>
          </button>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-lg font-semibold mb-6">Primary Color</h3>
        
        <div className="grid grid-cols-6 gap-3">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => setSettings({ ...settings, primaryColor: color })}
              className={cn(
                'w-full aspect-square rounded-xl transition-all',
                settings.primaryColor === color ? 'ring-4 ring-white/50 scale-110' : 'hover:scale-105'
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </GlassCard>
    </div>
  );
};

// Toggle Option Component
const ToggleOption = ({ label, description, checked, onChange }: any) => {
  return (
    <div className="flex items-center justify-between p-4 glass rounded-xl">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-white/60">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-12 h-6 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-white/20'
        )}
      >
        <div className={cn(
          'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform',
          checked ? 'translate-x-6' : 'translate-x-0.5'
        )} />
      </button>
    </div>
  );
};

// Placeholder components for other sections
const SecuritySettings = () => <div>Security settings coming soon...</div>;
const TeamSettings = () => <div>Team settings coming soon...</div>;
const APISettings = () => <div>API settings coming soon...</div>;