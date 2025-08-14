import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface AccessibleIconProps {
  Icon: LucideIcon;
  label?: string;
  decorative?: boolean;
  size?: number;
  className?: string;
}

/**
 * Accessible icon wrapper component
 * Ensures icons are properly labeled or marked as decorative
 */
export const AccessibleIcon: React.FC<AccessibleIconProps> = ({
  Icon,
  label,
  decorative = false,
  size = 20,
  className = ''
}) => {
  if (decorative) {
    return <Icon size={size} className={className} aria-hidden="true" />;
  }

  return (
    <span role="img" aria-label={label}>
      <Icon size={size} className={className} aria-hidden="true" />
    </span>
  );
};

/**
 * Icon button with proper accessibility
 */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  Icon: LucideIcon;
  label: string;
  size?: number;
  iconClassName?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  Icon,
  label,
  size = 20,
  iconClassName = '',
  className = '',
  ...buttonProps
}) => {
  return (
    <button
      aria-label={label}
      className={`focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${className}`}
      {...buttonProps}
    >
      <Icon size={size} className={iconClassName} aria-hidden="true" />
    </button>
  );
};