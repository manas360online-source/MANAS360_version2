import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'info' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

/**
 * Badge Component - Mental Wellness Optimized
 * 
 * Features:
 * - Soft, rounded design
 * - Multiple calming variants
 * - Size options
 * - Non-aggressive colors
 */
export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  // Base styles
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full';

  // Size variants
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  // Variant styles - soft, non-aggressive colors
  const variantStyles = {
    default: 'bg-calm-sage/20 text-calm-sage',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-gentle-blue/30 text-gentle-blue',
    soft: 'bg-soft-lavender/20 text-soft-lavender',
  };

  // Combine styles
  const combinedStyles = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;

  return (
    <span className={combinedStyles} {...props}>
      {children}
    </span>
  );
};

export default Badge;
