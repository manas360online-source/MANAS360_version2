import React from 'react';

export interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse';
  message?: string;
}

/**
 * Loader Component - Mental Wellness Optimized
 * 
 * Features:
 * - Calming animations
 * - Multiple variants
 * - Optional message
 * - Non-aggressive visuals
 */
export const Loader: React.FC<LoaderProps> = ({
  size = 'md',
  variant = 'spinner',
  message,
}) => {
  // Size variants
  const sizeStyles = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  // Spinner variant
  if (variant === 'spinner') {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <svg
          className={`animate-spin ${sizeStyles[size]} text-calm-sage`}
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
        {message && (
          <p className="text-sm text-wellness-muted animate-pulse">{message}</p>
        )}
      </div>
    );
  }

  // Dots variant
  if (variant === 'dots') {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-calm-sage rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 bg-soft-lavender rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-3 h-3 bg-gentle-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        {message && (
          <p className="text-sm text-wellness-muted">{message}</p>
        )}
      </div>
    );
  }

  // Pulse variant
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${sizeStyles[size]} bg-calm-sage rounded-full animate-ping opacity-75`} />
      {message && (
        <p className="text-sm text-wellness-muted animate-pulse">{message}</p>
      )}
    </div>
  );
};

export default Loader;
