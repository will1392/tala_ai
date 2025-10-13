import { useState, useEffect } from 'react';
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
  Save,
  LogOut,
  Settings as SettingsIcon
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { cn } from '../utils/cn';
import type { UserProfile } from '../components/onboarding/UserProfileOnboarding';
import CreditsDashboard from '../components/credits/CreditsDashboard';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState({
    // Profile
    userName: '',
    agencyName: '',
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

  // Load user profile on mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      // In development, check localStorage
      if (process.env.NODE_ENV === 'development') {
        const storedProfile = localStorage.getItem('tala_user_profile');
        if (storedProfile) {
          const profile = JSON.parse(storedProfile);
          setUserProfile(profile);
          setSettings(prev => ({
            ...prev,
            userName: profile.name || '',
            agencyName: profile.companyName || ''
          }));
        }
        return;
      }

      // Production: load from API
      const userId = 'test_user_123'; // This would come from auth context
      const response = await fetch(`/api/user-profile/${userId}`);
      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
        setSettings(prev => ({
          ...prev,
          userName: profile.name || '',
          agencyName: profile.companyName || ''
        }));
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSettings settings={settings} setSettings={setSettings} userProfile={userProfile} setUserProfile={setUserProfile} />;
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
      case 'billing':
        return <CreditsDashboard />;
      case 'data':
        return <DataSettings />;
      case 'language':
        return <LanguageSettings />;
      default:
        return <div>Section under construction</div>;
    }
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className="w-64">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <nav className="space-y-1">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                    'hover:bg-[var(--muted)]',
                    activeSection === section.id && 'bg-[var(--primary)]/20 text-[var(--primary)]'
                  )}
                >
                  <section.icon size={18} />
                  <span>{section.label}</span>
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>
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
const ProfileSettings = ({ settings, setSettings, userProfile, setUserProfile }: any) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const timezoneOptions = [
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' },
  ];

  const saveProfile = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      // Update user profile if name or agency changed
      if (userProfile && (settings.userName !== userProfile.name || settings.agencyName !== userProfile.companyName)) {
        const updatedProfile = {
          ...userProfile,
          name: settings.userName,
          companyName: settings.agencyName
        };

        // In development, save to localStorage
        if (process.env.NODE_ENV === 'development') {
          localStorage.setItem('tala_user_profile', JSON.stringify(updatedProfile));
          setUserProfile(updatedProfile);
          setSaveMessage('Profile saved successfully!');
        } else {
          // Production: save to API
          const userId = 'test_user_123'; // This would come from auth context
          const response = await fetch('/api/user-profile/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId
            },
            body: JSON.stringify(updatedProfile)
          });

          if (response.ok) {
            const result = await response.json();
            setUserProfile(result.profile);
            setSaveMessage('Profile saved successfully!');
          } else {
            setSaveMessage('Failed to save profile');
          }
        }
      }

      // Save other settings (email, phone, etc.) - would go to a separate endpoint
      setSaveMessage('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveMessage('Error saving profile');
    } finally {
      setIsSaving(false);
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="userName">Your Name</Label>
              <Input 
                id="userName"
                value={settings.userName}
                onChange={(e) => setSettings({ ...settings, userName: e.target.value })}
                placeholder="Enter your name"
              />
              <p className="text-xs text-[var(--muted)] mt-1">Tala will address you by this name</p>
            </div>
            
            <div>
              <Label htmlFor="agencyName">Agency Name</Label>
              <Input 
                id="agencyName"
                value={settings.agencyName}
                onChange={(e) => setSettings({ ...settings, agencyName: e.target.value })}
                placeholder="Enter your agency name"
              />
              <p className="text-xs text-[var(--muted)] mt-1">Your business name</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone"
                type="tel"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                id="timezone"
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                options={timezoneOptions}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          {saveMessage && (
            <p className={cn(
              "text-sm",
              saveMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'
            )}>
              {saveMessage}
            </p>
          )}
          <Button 
            variant="primary" 
            className="flex items-center gap-2 ml-auto"
            onClick={saveProfile}
            disabled={isSaving}
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agency Logo</CardTitle>
          <CardDescription>Upload your agency logo. Recommended size: 400x400px</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/80 rounded-xl flex items-center justify-center">
              <span className="text-3xl font-bold text-white">WT</span>
            </div>
            
            <div className="flex gap-3">
              <Button variant="primary" size="sm">Upload New Logo</Button>
              <Button variant="secondary" size="sm">Remove</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon size={20} className="text-[var(--primary)]" />
            Onboarding & Preferences
          </CardTitle>
          <CardDescription>
            Your profile helps Tala provide personalized marketing advice tailored to your business and expertise level.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => {
                  if (confirm('This will reset all your profile and expertise settings. Are you sure you want to start over?')) {
                    // Clear all onboarding data
                    localStorage.removeItem('tala_user_profile_completed');
                    localStorage.removeItem('tala_user_profile');
                    localStorage.removeItem('tala_expertise_onboarding_completed');
                    localStorage.removeItem('tala_expertise_profile');
                    
                    // Reload page to trigger onboarding
                    window.location.reload();
                  }
                }}
              >
                Retake Onboarding
              </Button>
              <Button variant="secondary" size="sm">
                Update Marketing Expertise
              </Button>
            </div>
            
            <div className="pt-4 border-t border-[var(--border)]">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 animate-pulse"></div>
                <div className="text-sm">
                  <p className="text-[var(--fg)]">Profile Status: <span className="text-green-600 font-medium">Complete</span></p>
                  <p className="text-[var(--muted)]">Last updated: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Notification Settings Component
const NotificationSettings = ({ settings, setSettings }: any) => {
  const reminderOptions = [
    { value: 'hourly', label: 'Every Hour' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ToggleOption
              label="Email Notifications"
              description="Receive updates and alerts via email"
              checked={settings.emailNotifications}
              onChange={(checked: boolean) => setSettings({ ...settings, emailNotifications: checked })}
            />
            
            <ToggleOption
              label="Push Notifications"
              description="Get instant notifications in your browser"
              checked={settings.pushNotifications}
              onChange={(checked: boolean) => setSettings({ ...settings, pushNotifications: checked })}
            />
            
            <ToggleOption
              label="SMS Notifications"
              description="Receive critical alerts via text message"
              checked={settings.smsNotifications}
              onChange={(checked: boolean) => setSettings({ ...settings, smsNotifications: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reminder Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="reminderFrequency">Task Reminder Frequency</Label>
            <Select
              id="reminderFrequency"
              value={settings.reminderFrequency}
              onChange={(e) => setSettings({ ...settings, reminderFrequency: e.target.value })}
              options={reminderOptions}
            />
          </div>
        </CardContent>
      </Card>
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
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Choose your preferred color scheme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSettings({ ...settings, theme: 'light' })}
              className={cn(
                'border border-[var(--border)] rounded-xl p-4 text-left transition-all',
                settings.theme === 'light' ? 'ring-2 ring-[var(--primary)]' : 'hover:bg-[var(--muted)]'
              )}
            >
              <div className="w-full h-20 bg-white rounded-lg mb-3" />
              <p className="font-medium">Light Theme</p>
              <p className="text-sm text-[var(--muted)]">Clean and bright</p>
            </button>
            
            <button
              onClick={() => setSettings({ ...settings, theme: 'dark' })}
              className={cn(
                'border border-[var(--border)] rounded-xl p-4 text-left transition-all',
                settings.theme === 'dark' ? 'ring-2 ring-[var(--primary)]' : 'hover:bg-[var(--muted)]'
              )}
            >
              <div className="w-full h-20 bg-gray-900 rounded-lg mb-3" />
              <p className="font-medium">Dark Theme</p>
              <p className="text-sm text-[var(--muted)]">Easy on the eyes</p>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Primary Color</CardTitle>
          <CardDescription>Select your accent color</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-3">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setSettings({ ...settings, primaryColor: color })}
                className={cn(
                  'w-full aspect-square rounded-xl transition-all',
                  settings.primaryColor === color ? 'ring-4 ring-[var(--ring)] scale-110' : 'hover:scale-105'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Toggle Option Component
const ToggleOption = ({ label, description, checked, onChange }: any) => {
  return (
    <div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-xl">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-[var(--muted)]">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-12 h-6 rounded-full transition-colors',
          checked ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
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
const SecuritySettings = () => {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Manage your account security and sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="pb-4 border-b border-[var(--border)]">
              <h3 className="text-sm font-medium mb-2">Change Password</h3>
              <p className="text-sm text-[var(--muted)] mb-4">Update your password to keep your account secure</p>
              <Button variant="secondary" size="sm">
                Change Password
              </Button>
            </div>

            <div className="pb-4 border-b border-[var(--border)]">
              <h3 className="text-sm font-medium mb-2">Two-Factor Authentication</h3>
              <p className="text-sm text-[var(--muted)] mb-4">Add an extra layer of security to your account</p>
              <Button variant="secondary" size="sm">
                Enable 2FA
              </Button>
            </div>

            <div className="pb-4 border-b border-[var(--border)]">
              <h3 className="text-sm font-medium mb-2">Active Sessions</h3>
              <p className="text-sm text-[var(--muted)] mb-4">Manage devices and sessions where you're logged in</p>
              <div className="flex items-start gap-3 p-3 bg-[var(--muted)] rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div className="text-sm flex-1">
                  <p className="text-[var(--fg)] font-medium">Current Session</p>
                  <p className="text-[var(--muted)]">{user?.email}</p>
                  <p className="text-[var(--muted)] text-xs mt-1">Last activity: Just now</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Account Actions</h3>
              <p className="text-sm text-[var(--muted)] mb-4">Sign out of your account or end all sessions</p>
              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Sign Out
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                >
                  End All Sessions
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const DataSettings = () => (
  <Card>
    <CardHeader>
      <CardTitle>Data & Storage</CardTitle>
      <CardDescription>Manage your data and storage preferences</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-[var(--muted)]">Data & Storage settings coming soon...</p>
    </CardContent>
  </Card>
);

const LanguageSettings = () => (
  <Card>
    <CardHeader>
      <CardTitle>Language Settings</CardTitle>
      <CardDescription>Set your language and regional preferences</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-[var(--muted)]">Language settings coming soon...</p>
    </CardContent>
  </Card>
);

const TeamSettings = () => (
  <Card>
    <CardHeader>
      <CardTitle>Team Settings</CardTitle>
      <CardDescription>Manage your team members and permissions</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-[var(--muted)]">Team settings coming soon...</p>
    </CardContent>
  </Card>
);

const APISettings = () => (
  <Card>
    <CardHeader>
      <CardTitle>API Keys</CardTitle>
      <CardDescription>Manage your API keys and integrations</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-[var(--muted)]">API settings coming soon...</p>
    </CardContent>
  </Card>
);