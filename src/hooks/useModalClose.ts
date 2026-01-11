import { useEffect, useCallback } from 'react';

interface UseModalCloseOptions {
  isOpen: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
}

/**
 * Hook for unified modal closing behavior
 * Provides ESC key closing and overlay click handling
 */
export const useModalClose = ({
  isOpen,
  onClose,
  closeOnEscape = true,
  closeOnOverlayClick = true
}: UseModalCloseOptions) => {
  
  // ESC key closing
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);
  
  // Overlay click handler
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose, closeOnOverlayClick]);
  
  // Stop propagation for content clicks
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);
  
  return {
    handleOverlayClick,
    handleContentClick
  };
};

export default useModalClose;
