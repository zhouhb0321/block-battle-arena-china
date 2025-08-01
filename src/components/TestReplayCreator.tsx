import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const TestReplayCreator: React.FC = () => {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);

  const createTestReplay = async () => {
    if (!user || user.isGuest) {
      toast({
        title: "需要登录",
        description: "请先登录才能创建测试录像",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      // 创建一个简单的测试录像
      const testActions = new Uint8Array([1, 2, 3, 4, 5]); // 模拟压缩动作数据
      
      const { data, error } = await supabase
        .from('compressed_replays')
        .insert({
          user_id: user.id,
          game_mode: 'sprint_40',
          game_type: 'single',
          seed: `test-${Date.now()}`,
          initial_board: Array(20).fill(null).map(() => Array(10).fill(0)),
          game_settings: {
            das: 88,
            arr: 32,
            sdf: 40,
            controls: {
              moveLeft: 'KeyA',
              moveRight: 'KeyD',
              softDrop: 'KeyS',
              hardDrop: 'KeyW',
              rotateClockwise: 'KeyL',
              rotateCounterclockwise: 'KeyO',
              rotate180: 'KeyI',
              hold: 'KeyK',
              pause: 'Escape',
              backToMenu: 'KeyB'
            },
            enableGhost: true,
            enableSound: true,
            masterVolume: 50
          },
          compressed_actions: testActions,
          actions_count: 150,
          compression_ratio: 0.75,
          final_score: 12345,
          final_lines: 40,
          final_level: 5,
          pps: 2.5,
          apm: 80,
          duration_seconds: 120,
          checksum: 'test-checksum',
          version: '2.0'
        })
        .select()
        .single();

      if (error) {
        console.error('创建测试录像失败:', error);
        toast({
          title: "创建失败",
          description: error.message,
          variant: "destructive"
        });
      } else {
        console.log('测试录像创建成功:', data);
        toast({
          title: "测试录像创建成功",
          description: `录像 ID: ${data.id}`,
        });
      }
    } catch (error) {
      console.error('创建测试录像出错:', error);
      toast({
        title: "创建出错",
        description: "创建测试录像时发生错误",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  if (!user || user.isGuest) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-600">请先登录才能使用测试录像功能</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>测试录像创建器</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          创建一个测试录像来验证回放系统是否正常工作
        </p>
        <Button 
          onClick={createTestReplay} 
          disabled={creating}
          className="w-full"
        >
          {creating ? '创建中...' : '创建测试录像'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default TestReplayCreator;