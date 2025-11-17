import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Shield, 
  CreditCard,
  Save,
  LogOut,
  Settings as SettingsIcon
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { cn } from '../utils/cn';
import type { UserProfile } from '../components/onboarding/UserProfileOnboarding';
import CreditsDashboard from '../components/credits/CreditsDashboard';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const settingsSections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

export const Settings = () => {
  const [activeSection, setActiveSection] = useState('profile');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState({
    userName: '',
    agencyName: '',
    email: '',
  });

  // Load user profile on mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        const storedProfile = localStorage.getItem('tala_user_profile');
        if (storedProfile) {
          const profile = JSON.parse(storedProfile);
          setUserProfile(profile);
          setSettings(prev => ({
            ...prev,
            userName: profile.name || '',
            agencyName: profile.companyName || '',
            email: profile.email || ''
          }));
        }
        return;
      }

      const userId = 'test_user_123';
      const response = await fetch(`/api/user-profile/${userId}`);
      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
        setSettings(prev => ({
          ...prev,
          userName: profile.name || '',
          agencyName: profile.companyName || '',
          email: profile.email || ''
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
      case 'security':
        return <SecuritySettings />;
      case 'billing':
        return <CreditsDashboard />;
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

  const saveProfile = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      if (userProfile && (settings.userName !== userProfile.name || settings.agencyName !== userProfile.companyName || settings.email !== userProfile.email)) {
        const updatedProfile = {
          ...userProfile,
          name: settings.userName,
          companyName: settings.agencyName,
          email: settings.email
        };

        if (process.env.NODE_ENV === 'development') {
          localStorage.setItem('tala_user_profile', JSON.stringify(updatedProfile));
          setUserProfile(updatedProfile);
          setSaveMessage('Profile saved successfully!');
        } else {
          const userId = 'test_user_123';
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
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveMessage('Error saving profile');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>These settings are automatically updated from your onboarding</CardDescription>
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

            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="Enter your email"
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

