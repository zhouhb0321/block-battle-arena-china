import { useEffect, useCallback } from 'react';

interface UseModalCloseOptions {
  isOpen: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  preventCloseWhileLoading?: boolean;
  isLoading?: boolean;
}

/**
 * Hook for unified modal closing behavior
 * Provides ESC key closing and overlay click handling
 * 
 * @example
 * ```tsx
 * const MyModal = ({ isOpen, onClose }) => {
 *   const { handleOverlayClick, handleContentClick } = useModalClose({
 *     isOpen,
 *     onClose,
 *     closeOnEscape: true,
 *     closeOnOverlayClick: true
 *   });
 * 
 *   return (
 *     <div className="overlay" onClick={handleOverlayClick}>
 *       <div className="content" onClick={handleContentClick}>
 *         ...
 *       </div>
 *     </div>
 *   );
 * };
 * ```
 */
export const useModalClose = ({
  isOpen,
  onClose,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  preventCloseWhileLoading = false,
  isLoading = false
}: UseModalCloseOptions) => {
  
  // Compute whether closing is allowed
  const canClose = !preventCloseWhileLoading || !isLoading;

  // Safe close handler
  const handleClose = useCallback(() => {
    if (!canClose) return;
    onClose();
  }, [canClose, onClose]);

  // ESC key closing
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canClose) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape, canClose]);
  
  // Overlay click handler
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget && canClose) {
      onClose();
    }
  }, [onClose, closeOnOverlayClick, canClose]);
  
  // Stop propagation for content clicks
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);
  
  return {
    handleClose,
    handleOverlayClick,
    handleContentClick,
    canClose
  };
};

export default useModalClose;

