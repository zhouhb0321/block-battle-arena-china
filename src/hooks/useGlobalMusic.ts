/**
 * 全局音乐控制钩子
 * 简化 MusicContext 的使用
 */

import { useMusicContext } from '@/contexts/MusicContext';

export const useGlobalMusic = () => {
  return useMusicContext();
};
