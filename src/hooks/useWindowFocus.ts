
import { useState, useEffect, useRef } from 'react';

export const useWindowFocus = () => {
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [wasManuallyPaused, setWasManuallyPaused] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleFocus = () => {
      console.log('窗口获得焦点');
      // 清除失焦暂停的延迟器
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      setIsWindowFocused(true);
    };

    const handleBlur = () => {
      console.log('窗口失去焦点');
      // 延迟3秒后才暂停游戏，避免过于敏感
      blurTimeoutRef.current = setTimeout(() => {
        setIsWindowFocused(false);
      }, 3000);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('页面变为隐藏状态');
        // 页面隐藏时立即暂停
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current);
        }
        setIsWindowFocused(false);
      } else {
        console.log('页面变为可见状态');
        // 清除任何延迟器
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current);
          blurTimeoutRef.current = null;
        }
        setIsWindowFocused(true);
      }
    };

    // 监听窗口焦点事件
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 初始状态检查
    setIsWindowFocused(!document.hidden && document.hasFocus());

    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { 
    isWindowFocused, 
    wasManuallyPaused, 
    setWasManuallyPaused 
  };
};
