
import { useState, useEffect } from 'react';

export const useWindowFocus = () => {
  const [isWindowFocused, setIsWindowFocused] = useState(true);

  useEffect(() => {
    const handleFocus = () => {
      console.log('窗口获得焦点');
      setIsWindowFocused(true);
    };

    const handleBlur = () => {
      console.log('窗口失去焦点');
      setIsWindowFocused(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('页面变为隐藏状态');
        setIsWindowFocused(false);
      } else {
        console.log('页面变为可见状态');
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
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isWindowFocused;
};
