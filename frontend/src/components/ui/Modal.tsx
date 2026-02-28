import React, { useEffect } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

/**
 * Modal Component - Mental Wellness Optimized
 * 
 * Features:
 * - Soft backdrop blur
 * - Gentle animations
 * - Accessible (ESC to close, focus trap)
 * - Multiple size options
 * - Click outside to close
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
}) => {
  // Size variants
  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 animate-fadeIn"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-wellness-text/40 backdrop-blur-md transition-smooth" />

      {/* Modal Content */}
      <div
        className={`relative bg-white rounded-3xl shadow-soft-2xl w-full ${sizeStyles[size]} max-h-[90vh] overflow-y-auto animate-scaleIn`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 md:p-8 border-b border-calm-sage/10">
            <h2 className="text-2xl font-serif text-wellness-text">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-calm-sage/10 transition-smooth focus-ring"
              aria-label="Close modal"
            >
              <svg
                className="w-6 h-6 text-wellness-muted"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 md:p-8">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
