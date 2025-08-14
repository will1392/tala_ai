import React from 'react';
import { srOnly } from '../../utils/accessibility';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

/**
 * Skip link component for keyboard navigation
 * Allows users to skip repetitive content and navigate directly to main content
 */
export const SkipLink: React.FC<SkipLinkProps> = ({ href, children }) => {
  return (
    <a
      href={href}
      className={`${srOnly} focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light focus:shadow-lg`}
    >
      {children}
    </a>
  );
};

/**
 * Container for skip links
 * Provides multiple skip link options for better navigation
 */
export const SkipLinks: React.FC = () => {
  return (
    <div className="skip-links">
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <SkipLink href="#main-navigation">Skip to navigation</SkipLink>
      <SkipLink href="#search">Skip to search</SkipLink>
    </div>
  );
};