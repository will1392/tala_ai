import { useEffect, useCallback } from 'react';

type ShortcutHandler = () => void;
type ShortcutMap = Record<string, ShortcutHandler>;

interface KeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
}

export const useKeyboardShortcuts = (
  shortcuts: ShortcutMap,
  options: KeyboardShortcutsOptions = {}
) => {
  const { enabled = true, preventDefault = true } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Build the shortcut string
    const modifiers = [];
    if (event.metaKey || event.ctrlKey) modifiers.push('cmd');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');
    
    const key = event.key.toLowerCase();
    const shortcut = [...modifiers, key].join('+');

    // Check if we have a handler for this shortcut
    const handler = shortcuts[shortcut];
    if (handler) {
      if (preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }
      handler();
    }
  }, [shortcuts, enabled, preventDefault]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  // Return a function to programmatically trigger shortcuts
  const triggerShortcut = useCallback((shortcut: string) => {
    const handler = shortcuts[shortcut];
    if (handler) {
      handler();
    }
  }, [shortcuts]);

  return { triggerShortcut };
};

// Common shortcut patterns
export const COMMON_SHORTCUTS = {
  SEARCH: 'cmd+k',
  SAVE: 'cmd+s',
  NEW: 'cmd+n',
  CLOSE: 'esc',
  HELP: 'cmd+/',
  TOGGLE_THEME: 'cmd+shift+d',
  UNDO: 'cmd+z',
  REDO: 'cmd+shift+z',
  COPY: 'cmd+c',
  PASTE: 'cmd+v',
  CUT: 'cmd+x',
  SELECT_ALL: 'cmd+a'
};

// Shortcut formatter for display
export const formatShortcut = (shortcut: string): string => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  return shortcut
    .split('+')
    .map(key => {
      switch (key) {
        case 'cmd':
          return isMac ? '⌘' : 'Ctrl';
        case 'alt':
          return isMac ? '⌥' : 'Alt';
        case 'shift':
          return '⇧';
        case 'enter':
          return '↵';
        case 'esc':
          return 'ESC';
        case 'space':
          return 'Space';
        case 'tab':
          return 'Tab';
        case 'delete':
          return '⌫';
        case 'backspace':
          return '⌫';
        default:
          return key.toUpperCase();
      }
    })
    .join('');
};