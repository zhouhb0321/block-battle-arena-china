import { toast } from 'sonner';

// i18n Toast utility - call these with already-translated strings or translation keys
// For components, use the useI18nToast hook instead

export const i18nToast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast.info(message),
  warning: (message: string) => toast.warning(message),
};

// Hook version for use in components with access to useLanguage
import { useLanguage } from '@/contexts/LanguageContext';
import { useCallback, useMemo } from 'react';

export const useI18nToast = () => {
  const { t } = useLanguage();
  
  return useMemo(() => ({
    success: (key: string) => toast.success(t(key)),
    error: (key: string) => toast.error(t(key)),
    info: (key: string) => toast.info(t(key)),
    warning: (key: string) => toast.warning(t(key)),
    // For dynamic messages that aren't translation keys
    successRaw: (message: string) => toast.success(message),
    errorRaw: (message: string) => toast.error(message),
    infoRaw: (message: string) => toast.info(message),
    warningRaw: (message: string) => toast.warning(message),
  }), [t]);
};
