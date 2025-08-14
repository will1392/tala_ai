import React, { useState } from 'react';
import { 
  SkipLinks, 
  LiveRegion, 
  FocusManager, 
  AccessibleIcon, 
  IconButton,
  useAnnounce 
} from '../components/accessibility';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import Drawer from '../components/shared/Drawer';
import InlineNotice from '../components/shared/InlineNotice';
import { ToastProvider, useToast } from '../components/toast/ToastProvider';
import { Home, Settings, User, Bell, Search, Menu } from 'lucide-react';

const AccessibilityDemoContent = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const announce = useAnnounce();
  const { push } = useToast();

  const handleAnnouncement = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announce(message, priority);
    setLiveMessage(message);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Skip Links */}
      <SkipLinks />

      {/* Header with proper landmarks */}
      <header role="banner" className="bg-panel border-b border-border p-4">
        <nav role="navigation" aria-label="Main navigation" className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <IconButton
              Icon={Menu}
              label="Open navigation menu"
              onClick={() => setDrawerOpen(true)}
              className="p-2 hover:bg-muted rounded-lg"
            />
            <h1 className="text-2xl font-bold">Accessibility Demo</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <IconButton
              Icon={Search}
              label="Search"
              className="p-2 hover:bg-muted rounded-lg"
            />
            <IconButton
              Icon={Bell}
              label="Notifications (3 unread)"
              className="p-2 hover:bg-muted rounded-lg relative"
            />
            <IconButton
              Icon={User}
              label="User profile"
              className="p-2 hover:bg-muted rounded-lg"
            />
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main id="main-content" role="main" aria-label="Main content" className="p-8 max-w-6xl mx-auto">
        <section aria-labelledby="demo-heading" className="space-y-8">
          <div>
            <h2 id="demo-heading" className="text-3xl font-bold mb-4">Accessibility Features Demo</h2>
            <p className="text-muted-foreground mb-6">
              This page demonstrates the accessibility enhancements implemented across the application.
            </p>
          </div>

          {/* Modal Demo */}
          <section aria-labelledby="modal-section">
            <h3 id="modal-section" className="text-xl font-semibold mb-4">Accessible Modal</h3>
            <div className="space-y-4">
              <p>Modal with proper ARIA attributes, focus trap, and ESC key handling:</p>
              <Button onClick={() => setModalOpen(true)}>
                Open Modal
              </Button>
              <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Accessible Modal Example"
                description="This modal demonstrates proper focus management and keyboard navigation"
              >
                <div className="space-y-4">
                  <p>This modal includes:</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Focus trap - Tab key cycles through modal elements only</li>
                    <li>ESC key to close</li>
                    <li>Proper ARIA labels and descriptions</li>
                    <li>Focus restoration when closed</li>
                  </ul>
                  <div className="flex gap-3">
                    <Button onClick={() => setModalOpen(false)}>
                      Close Modal
                    </Button>
                    <Button variant="secondary">
                      Secondary Action
                    </Button>
                  </div>
                </div>
              </Modal>
            </div>
          </section>

          {/* Drawer Demo */}
          <section aria-labelledby="drawer-section">
            <h3 id="drawer-section" className="text-xl font-semibold mb-4">Accessible Drawer</h3>
            <div className="space-y-4">
              <p>Navigation drawer with focus management and keyboard support:</p>
              <Button onClick={() => setDrawerOpen(true)}>
                Open Navigation Drawer
              </Button>
              <Drawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title="Navigation Menu"
                description="Main application navigation"
              >
                <div className="p-4">
                  <nav role="navigation" className="space-y-2">
                    <a href="#" className="block p-3 hover:bg-muted rounded-lg flex items-center gap-3">
                      <AccessibleIcon Icon={Home} label="Home" />
                      <span>Home</span>
                    </a>
                    <a href="#" className="block p-3 hover:bg-muted rounded-lg flex items-center gap-3">
                      <AccessibleIcon Icon={Settings} label="Settings" />
                      <span>Settings</span>
                    </a>
                    <a href="#" className="block p-3 hover:bg-muted rounded-lg flex items-center gap-3">
                      <AccessibleIcon Icon={User} label="Profile" />
                      <span>Profile</span>
                    </a>
                  </nav>
                </div>
              </Drawer>
            </div>
          </section>

          {/* Live Regions Demo */}
          <section aria-labelledby="live-section">
            <h3 id="live-section" className="text-xl font-semibold mb-4">Live Regions & Announcements</h3>
            <div className="space-y-4">
              <p>Screen reader announcements for dynamic content:</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleAnnouncement('Polite announcement: Task completed successfully', 'polite')}
                >
                  Polite Announcement
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleAnnouncement('Assertive announcement: Error occurred!', 'assertive')}
                >
                  Assertive Announcement
                </Button>
              </div>
              {liveMessage && (
                <LiveRegion message={liveMessage} priority="polite" />
              )}
            </div>
          </section>

          {/* Toast Notifications Demo */}
          <section aria-labelledby="toast-section">
            <h3 id="toast-section" className="text-xl font-semibold mb-4">Accessible Toast Notifications</h3>
            <div className="space-y-4">
              <p>Toast notifications with proper ARIA roles and live regions:</p>
              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={() => push({ message: 'Info toast message', kind: 'info' })}
                >
                  Info Toast
                </Button>
                <Button
                  onClick={() => push({ message: 'Success! Operation completed', kind: 'success' })}
                  variant="secondary"
                >
                  Success Toast
                </Button>
                <Button
                  onClick={() => push({ message: 'Warning: Check your input', kind: 'warning' })}
                  variant="secondary"
                >
                  Warning Toast
                </Button>
                <Button
                  onClick={() => push({ message: 'Error: Operation failed', kind: 'error' })}
                  variant="destructive"
                >
                  Error Toast
                </Button>
              </div>
            </div>
          </section>

          {/* Inline Notices Demo */}
          <section aria-labelledby="notice-section">
            <h3 id="notice-section" className="text-xl font-semibold mb-4">Accessible Inline Notices</h3>
            <div className="space-y-4">
              <p>Inline notices with appropriate ARIA roles based on severity:</p>
              <InlineNotice
                kind="info"
                title="Information"
                message="This is an informational notice with role='status'"
              />
              <InlineNotice
                kind="success"
                title="Success"
                message="Operation completed successfully with role='status'"
              />
              <InlineNotice
                kind="warning"
                title="Warning"
                message="Please review your input with role='alert'"
              />
              <InlineNotice
                kind="error"
                title="Error"
                message="An error occurred with role='alert'"
              />
            </div>
          </section>

          {/* Focus Management Demo */}
          <section aria-labelledby="focus-section">
            <h3 id="focus-section" className="text-xl font-semibold mb-4">Focus Management</h3>
            <div className="space-y-4">
              <p>Components with proper focus management:</p>
              <FocusManager autoFocus containFocus>
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This container has focus containment. Tab key will cycle within this area only.
                  </p>
                  <div className="flex gap-3">
                    <Button>First Button</Button>
                    <Button variant="secondary">Second Button</Button>
                    <Button variant="ghost">Third Button</Button>
                  </div>
                  <input
                    type="text"
                    placeholder="Text input"
                    className="px-3 py-2 border border-border rounded-lg w-full"
                    aria-label="Example text input"
                  />
                </div>
              </FocusManager>
            </div>
          </section>

          {/* Keyboard Navigation Info */}
          <section aria-labelledby="keyboard-section">
            <h3 id="keyboard-section" className="text-xl font-semibold mb-4">Keyboard Navigation</h3>
            <div className="space-y-4">
              <p>The application supports comprehensive keyboard navigation:</p>
              <ul className="list-disc list-inside space-y-2">
                <li><kbd>Tab</kbd> - Navigate forward through interactive elements</li>
                <li><kbd>Shift + Tab</kbd> - Navigate backward</li>
                <li><kbd>Enter</kbd> or <kbd>Space</kbd> - Activate buttons</li>
                <li><kbd>Escape</kbd> - Close modals, drawers, and dropdowns</li>
                <li><kbd>Arrow keys</kbd> - Navigate within menus and lists</li>
              </ul>
            </div>
          </section>

          {/* Screen Reader Support */}
          <section aria-labelledby="screenreader-section">
            <h3 id="screenreader-section" className="text-xl font-semibold mb-4">Screen Reader Support</h3>
            <div className="space-y-4">
              <p>Features for screen reader users:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Skip links to navigate directly to main content</li>
                <li>Proper heading hierarchy for easy navigation</li>
                <li>ARIA labels on all interactive elements</li>
                <li>Live regions for dynamic content updates</li>
                <li>Semantic HTML landmarks (header, nav, main, footer)</li>
                <li>Descriptive alt text for images</li>
                <li>Form labels and error messages</li>
              </ul>
            </div>
          </section>
        </section>
      </main>

      {/* Footer with proper landmark */}
      <footer role="contentinfo" className="bg-panel border-t border-border p-8 mt-12">
        <div className="max-w-6xl mx-auto text-center text-muted-foreground">
          <p>© 2024 Tala AI - Built with accessibility in mind</p>
        </div>
      </footer>
    </div>
  );
};

const AccessibilityDemo = () => {
  return (
    <ToastProvider>
      <AccessibilityDemoContent />
    </ToastProvider>
  );
};

export default AccessibilityDemo;