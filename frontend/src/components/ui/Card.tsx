import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'soft' | 'glass' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  children: React.ReactNode;
}

/**
 * Card Component - Mental Wellness Optimized
 * 
 * Features:
 * - Soft shadows and rounded corners
 * - Multiple variants for different contexts
 * - Gentle hover effects (optional)
 * - Flexible padding options
 * - Glass morphism support
 */
export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  hover = false,
  className = '',
  children,
  ...props
}) => {
  // Base styles
  const baseStyles = 'rounded-3xl transition-smooth';

  // Variant styles
  const variantStyles = {
    default: 'bg-white shadow-soft-md border border-white/60',
    soft: 'bg-wellness-surface shadow-soft-sm border border-calm-sage/10',
    glass: 'bg-white/60 backdrop-blur-lg shadow-soft-sm border border-white/30',
    elevated: 'bg-white shadow-soft-lg border border-white/80',
  };

  // Padding styles
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4 md:p-6',
    md: 'p-6 md:p-8',
    lg: 'p-8 md:p-10 lg:p-12',
  };

  // Hover effect
  const hoverStyles = hover ? 'hover:-translate-y-1 hover:shadow-soft-lg cursor-pointer' : '';

  // Combine styles
  const combinedStyles = `${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${hoverStyles} ${className}`;

  return (
    <div className={combinedStyles} {...props}>
      {children}
    </div>
  );
};

export default Card;
