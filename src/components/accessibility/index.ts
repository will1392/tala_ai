/**
 * Accessibility Components and Utilities
 * Central export for all accessibility-related components and hooks
 */

export { SkipLink, SkipLinks } from './SkipLink';
export { LiveRegion, LiveRegionManager, useAnnounce } from './LiveRegion';
export { FocusManager, useFocusManager } from './FocusManager';
export { AccessibleIcon, IconButton } from './AccessibleIcon';

// Re-export utilities
export {
  useFocusTrap,
  useEscapeKey,
  useAnnouncement,
  getAriaRole,
  getAriaLive,
  srOnly
} from '../../utils/accessibility';