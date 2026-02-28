import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

/**
 * Button Component - Mental Wellness Optimized
 * 
 * Features:
 * - Soft, rounded design
 * - Gentle hover effects
 * - Multiple calming variants
 * - Accessible focus states
 * - Loading state support
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}) => {
  // Base styles - rounded, soft, accessible
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-smooth focus-ring disabled:opacity-50 disabled:cursor-not-allowed';

  // Size variants
  const sizeStyles = {
    sm: 'px-5 py-2 text-sm min-h-[40px]',
    md: 'px-8 py-3 text-base min-h-[48px]',
    lg: 'px-10 py-4 text-lg min-h-[56px]',
  };

  // Variant styles - calming colors
  const variantStyles = {
    primary: 'bg-gradient-calm text-white hover:shadow-soft-lg hover:-translate-y-0.5 active:translate-y-0',
    secondary: 'bg-white text-wellness-text border-2 border-calm-sage/30 hover:border-calm-sage hover:shadow-soft-sm hover:-translate-y-0.5',
    ghost: 'bg-transparent text-wellness-text hover:bg-calm-sage/10 hover:text-calm-sage',
    soft: 'bg-calm-sage/10 text-wellness-text hover:bg-calm-sage/20 hover:shadow-soft-xs',
  };

  // Width
  const widthStyles = fullWidth ? 'w-full' : '';

  // Combine styles
  const combinedStyles = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyles} ${className}`;

  return (
    <button
      className={combinedStyles}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
