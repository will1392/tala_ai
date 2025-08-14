/**
 * Utility to announce messages to screen readers
 */

let announcer: HTMLDivElement | null = null;

/**
 * Creates or gets the screen reader announcer element
 */
function getAnnouncer(): HTMLDivElement {
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.style.position = 'absolute';
    announcer.style.left = '-10000px';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.overflow = 'hidden';
    document.body.appendChild(announcer);
  }
  return announcer;
}

/**
 * Announces a message to screen readers
 * @param message - The message to announce
 * @param priority - The priority level ('polite' or 'assertive')
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcer = getAnnouncer();
  announcer.setAttribute('aria-live', priority);
  
  // Clear and set message to ensure it's announced
  announcer.textContent = '';
  setTimeout(() => {
    announcer.textContent = message;
  }, 100);
}

/**
 * Announces status changes for chat operations
 */
export function announceChatStatus(status: string): void {
  const statusMessages: Record<string, string> = {
    'initializing': 'Initializing chat system',
    'context': 'Loading conversation context',
    'searching': 'Searching knowledge base',
    'analyzing': 'Analyzing information',
    'generating': 'Generating response',
    'complete': 'Response complete',
    'error': 'An error occurred. Please try again.',
    'offline': 'You are offline. Messages will be queued.',
    'online': 'Connection restored',
    'message-sent': 'Message sent',
    'message-received': 'New message received',
    'conversation-switched': 'Switched to different conversation',
    'new-chat': 'Started new chat'
  };

  const message = statusMessages[status] || status;
  announceToScreenReader(message);
}