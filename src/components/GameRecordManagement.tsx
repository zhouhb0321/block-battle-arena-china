import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Search, Download } from 'lucide-react';

interface GameRecord {
  id: string;
  user_id: string;
  username: string;
  game_mode: string;
  final_score: number;
  final_lines: number;
  pps: number;
  apm: number;
  duration: number;
  created_at: string;
}

const GameRecordManagement: React.FC = () => {
  const [gameRecords, setGameRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [gameModeFilter, setGameModeFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchGameRecords();
  }, []);

  const fetchGameRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('game_replays_new')
        .select(`
          *,
          user_profiles(username)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const formattedRecords = data?.map(record => ({
        id: record.id,
        user_id: record.user_id,
        username: record.user_profiles?.username || 'Unknown',
        game_mode: record.game_mode,
        final_score: record.final_score,
        final_lines: record.final_lines,
        pps: record.pps,
        apm: record.apm,
        duration: record.duration,
        created_at: record.created_at
      })) || [];

      setGameRecords(formattedRecords);
    } catch (error) {
      console.error('Error fetching game records:', error);
      toast({
        title: "错误",
        description: "获取游戏记录失败",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = gameRecords.filter(record => {
    const matchesSearch = !searchTerm || 
      record.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMode = gameModeFilter === 'all' || record.game_mode === gameModeFilter;
    return matchesSearch && matchesMode;
  });

  if (loading) {
    return <div className="flex justify-center p-8">加载游戏记录中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">游戏记录管理</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{gameRecords.length}</div>
            <p className="text-sm text-muted-foreground">游戏记录总数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredRecords.length}</div>
            <p className="text-sm text-muted-foreground">筛选后数量</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {Math.round(gameRecords.reduce((sum, r) => sum + r.final_score, 0) / gameRecords.length || 0)}
            </div>
            <p className="text-sm text-muted-foreground">平均得分</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={gameModeFilter} onValueChange={setGameModeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="游戏模式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有模式</SelectItem>
                <SelectItem value="sprint_40">40行竞速</SelectItem>
                <SelectItem value="classic">经典模式</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户名</TableHead>
                <TableHead>游戏模式</TableHead>
                <TableHead>得分</TableHead>
                <TableHead>行数</TableHead>
                <TableHead>PPS</TableHead>
                <TableHead>APM</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.username}</TableCell>
                  <TableCell>{record.game_mode}</TableCell>
                  <TableCell>{record.final_score.toLocaleString()}</TableCell>
                  <TableCell>{record.final_lines}</TableCell>
                  <TableCell>{record.pps.toFixed(2)}</TableCell>
                  <TableCell>{record.apm.toFixed(0)}</TableCell>
                  <TableCell>{new Date(record.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameRecordManagement;