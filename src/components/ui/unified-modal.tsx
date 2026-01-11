/**
 * Unified Modal Component Library
 * Provides consistent modal/dialog behavior across the application
 * 
 * Features:
 * - ESC key closing
 * - Overlay click closing
 * - Consistent styling
 * - Loading states
 * - Confirmation dialogs
 */

import React, { useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============= Unified Modal Hook =============

interface UseUnifiedModalOptions {
  isOpen: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  preventCloseWhileLoading?: boolean;
  isLoading?: boolean;
}

export const useUnifiedModal = ({
  isOpen,
  onClose,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  preventCloseWhileLoading = true,
  isLoading = false
}: UseUnifiedModalOptions) => {
  
  const handleClose = useCallback(() => {
    if (preventCloseWhileLoading && isLoading) return;
    onClose();
  }, [onClose, preventCloseWhileLoading, isLoading]);

  // ESC key handler
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, handleClose]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      handleClose();
    }
  }, [closeOnOverlayClick, handleClose]);

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return {
    handleClose,
    handleOverlayClick,
    handleContentClick,
    canClose: !preventCloseWhileLoading || !isLoading
  };
};

// ============= Base Modal Component =============

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw]'
};

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  showCloseButton = true,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  isLoading = false,
  size = 'md'
}) => {
  const { handleClose, handleOverlayClick, handleContentClick, canClose } = useUnifiedModal({
    isOpen,
    onClose,
    closeOnEscape,
    closeOnOverlayClick,
    isLoading
  });

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={handleOverlayClick}
    >
      <Card 
        className={cn(
          'w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200',
          sizeClasses[size],
          className
        )}
        onClick={handleContentClick}
      >
        {(title || showCloseButton) && (
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              {title && (
                typeof title === 'string' ? (
                  <CardTitle>{title}</CardTitle>
                ) : (
                  title
                )
              )}
              {showCloseButton && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleClose}
                  disabled={!canClose}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </CardHeader>
        )}
        
        <CardContent className="flex-1 overflow-y-auto">
          {children}
        </CardContent>
        
        {footer && (
          <div className="flex-shrink-0 border-t p-4">
            {footer}
          </div>
        )}
      </Card>
    </div>
  );
};

// ============= Confirmation Modal =============

type ConfirmVariant = 'default' | 'destructive' | 'warning' | 'success';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

const variantConfig: Record<ConfirmVariant, { 
  icon: React.ReactNode; 
  buttonVariant: 'default' | 'destructive' | 'outline';
  iconColor: string;
}> = {
  default: { 
    icon: <Info className="w-6 h-6" />, 
    buttonVariant: 'default',
    iconColor: 'text-primary'
  },
  destructive: { 
    icon: <AlertCircle className="w-6 h-6" />, 
    buttonVariant: 'destructive',
    iconColor: 'text-destructive'
  },
  warning: { 
    icon: <AlertTriangle className="w-6 h-6" />, 
    buttonVariant: 'default',
    iconColor: 'text-amber-500'
  },
  success: { 
    icon: <CheckCircle className="w-6 h-6" />, 
    buttonVariant: 'default',
    iconColor: 'text-green-500'
  }
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'default',
  isLoading = false
}) => {
  const config = variantConfig[variant];

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      isLoading={isLoading}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button 
            variant={config.buttonVariant} 
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                处理中...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-4">
        <div className={cn('flex-shrink-0', config.iconColor)}>
          {config.icon}
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </BaseModal>
  );
};

// ============= Loading Modal =============

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
  isOpen,
  message = '加载中...'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-foreground">{message}</span>
        </div>
      </Card>
    </div>
  );
};

// ============= Alert Modal =============

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  buttonText?: string;
}

const alertVariantConfig: Record<string, { icon: React.ReactNode; iconColor: string }> = {
  info: { icon: <Info className="w-6 h-6" />, iconColor: 'text-blue-500' },
  success: { icon: <CheckCircle className="w-6 h-6" />, iconColor: 'text-green-500' },
  warning: { icon: <AlertTriangle className="w-6 h-6" />, iconColor: 'text-amber-500' },
  error: { icon: <AlertCircle className="w-6 h-6" />, iconColor: 'text-destructive' }
};

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info',
  buttonText = '确定'
}) => {
  const config = alertVariantConfig[variant];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose}>{buttonText}</Button>
        </div>
      }
    >
      <div className="flex items-start gap-4">
        <div className={cn('flex-shrink-0', config.iconColor)}>
          {config.icon}
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </BaseModal>
  );
};

// ============= Form Modal =============

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
  title: string;
  description?: string;
  children: React.ReactNode;
  submitText?: string;
  cancelText?: string;
  isLoading?: boolean;
  isValid?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  children,
  submitText = '提交',
  cancelText = '取消',
  isLoading = false,
  isValid = true,
  size = 'md'
}) => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      isLoading={isLoading}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button 
            onClick={() => onSubmit()}
            disabled={isLoading || !isValid}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                处理中...
              </>
            ) : (
              submitText
            )}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        {children}
      </form>
    </BaseModal>
  );
};

// ============= Full Screen Modal =============

interface FullScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
}

export const FullScreenModal: React.FC<FullScreenModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true
}) => {
  const { handleClose } = useUnifiedModal({
    isOpen,
    onClose,
    closeOnEscape: true,
    closeOnOverlayClick: false
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col animate-in fade-in duration-200">
      {(title || showCloseButton) && (
        <div className="flex items-center justify-between p-4 border-b">
          {title && <h2 className="text-xl font-semibold">{title}</h2>}
          {showCloseButton && (
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
};

// ============= Exports =============

export default {
  BaseModal,
  ConfirmModal,
  LoadingModal,
  AlertModal,
  FormModal,
  FullScreenModal,
  useUnifiedModal
};
