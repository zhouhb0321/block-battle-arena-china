
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { GameReplay } from '@/utils/gameTypes';

interface ReplayUploadResult {
  success: boolean;
  replayId?: string;
  error?: string;
}

export const useReplayUpload = () => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadReplay = useCallback(async (replayData: Partial<GameReplay>): Promise<ReplayUploadResult> => {
    if (!user || user.isGuest) {
      return { success: false, error: 'User must be authenticated to upload replays' };
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 验证回放数据的完整性
      if (!replayData.actions || replayData.actions.length === 0) {
        throw new Error('回放数据不完整');
      }

      // 计算回放数据的校验和，防止篡改
      const dataString = JSON.stringify(replayData.actions);
      const checksum = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataString));
      const checksumArray = Array.from(new Uint8Array(checksum));
      const checksumHex = checksumArray.map(b => b.toString(16).padStart(2, '0')).join('');

      setUploadProgress(25);

      // 准备上传数据
      const uploadData = {
        user_id: user.id,
        game_mode: replayData.gameType || 'sprint_40',
        final_score: replayData.score || 0,
        final_lines: replayData.lines || 0,
        final_level: replayData.level || 1,
        duration: replayData.duration || 0,
        pps: replayData.pps || 0,
        apm: replayData.apm || 0,
        replay_data: {
          actions: replayData.actions,
          initialBoard: replayData.finalBoard || Array(20).fill(null).map(() => Array(10).fill(0)),
          checksum: checksumHex,
          version: '1.0'
        },
        game_settings: replayData.metadata?.settings || {},
        key_inputs: [], // 可以添加按键输入记录
        game_events: [], // 可以添加游戏事件记录
        is_personal_best: false, // 将在服务器端计算
        is_world_record: false   // 将在服务器端计算
      };

      setUploadProgress(50);

      // 上传到数据库
      const { data, error } = await supabase
        .from('game_replays_new')
        .insert(uploadData)
        .select()
        .single();

      if (error) throw error;

      setUploadProgress(75);

      // 检查是否为个人最佳记录
      const { data: bestRecord } = await supabase
        .from('user_best_records')
        .select('*')
        .eq('user_id', user.id)
        .eq('game_mode', replayData.gameType || 'sprint_40')
        .single();

      const isPersonalBest = !bestRecord || (replayData.score || 0) > (bestRecord.best_score || 0);

      if (isPersonalBest) {
        // 更新个人最佳记录
        await supabase
          .from('user_best_records')
          .upsert({
            user_id: user.id,
            game_mode: replayData.gameType || 'sprint_40',
            best_score: replayData.score || 0,
            best_lines: replayData.lines || 0,
            best_pps: replayData.pps || 0,
            best_apm: replayData.apm || 0,
            best_time: replayData.duration || 0,
            replay_id: data.id,
            achieved_at: new Date().toISOString()
          });

        // 标记回放为个人最佳
        await supabase
          .from('game_replays_new')
          .update({ is_personal_best: true })
          .eq('id', data.id);
      }

      setUploadProgress(100);

      return { success: true, replayId: data.id };
    } catch (error) {
      console.error('Failed to upload replay:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '上传失败' 
      };
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [user]);

  const verifyReplay = useCallback(async (replayId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('game_replays_new')
        .select('replay_data')
        .eq('id', replayId)
        .single();

      if (error || !data) return false;

      const replayData = data.replay_data as any;
      if (!replayData.actions || !replayData.checksum) return false;

      // 验证校验和
      const dataString = JSON.stringify(replayData.actions);
      const checksum = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataString));
      const checksumArray = Array.from(new Uint8Array(checksum));
      const checksumHex = checksumArray.map(b => b.toString(16).padStart(2, '0')).join('');

      return checksumHex === replayData.checksum;
    } catch (error) {
      console.error('Failed to verify replay:', error);
      return false;
    }
  }, []);

  return {
    uploadReplay,
    verifyReplay,
    isUploading,
    uploadProgress
  };
};
