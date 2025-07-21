/**
 * Utility for combining class names
 * Similar to clsx but simpler
 */

export function cn(...inputs) {
  return inputs
    .filter(Boolean)
    .join(' ')
    .trim();
}