import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines clsx and tailwind-merge for optimal class name merging
 * Handles Tailwind CSS class conflicts intelligently
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}