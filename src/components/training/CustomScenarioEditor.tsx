import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Edit3, 
  Play, 
  Save, 
  Trash2, 
  Download, 
  Upload,
  Grid3X3,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CustomScenarioEditorProps {
  onGameStart: (gameType: string, gameMode: any) => void;
}

interface CustomScenario {
  id: string;
  name: string;
  description: string;
  board: number[][];
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  goal: string;
  createdAt: string;
}

const CustomScenarioEditor: React.FC<CustomScenarioEditorProps> = ({ onGameStart }) => {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<CustomScenario[]>([]);
  
  // 编辑器状态
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDescription, setScenarioDescription] = useState('');
  const [scenarioGoal, setScenarioGoal] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [board, setBoard] = useState<number[][]>(
    Array(20).fill(null).map(() => Array(10).fill(0))
  );
  const [selectedCell, setSelectedCell] = useState<'empty' | 'filled'>('filled');

  // 从localStorage加载已保存的场景
  React.useEffect(() => {
    const saved = localStorage.getItem('customScenarios');
    if (saved) {
      try {
        setSavedScenarios(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load custom scenarios:', e);
      }
    }
  }, []);

  const toggleCell = (row: number, col: number) => {
    const newBoard = board.map((r, i) => 
      i === row ? r.map((c, j) => j === col ? (selectedCell === 'filled' ? 1 : 0) : c) : r
    );
    setBoard(newBoard);
  };

  const clearBoard = () => {
    setBoard(Array(20).fill(null).map(() => Array(10).fill(0)));
  };

  const fillBoard = () => {
    setBoard(Array(20).fill(null).map(() => Array(10).fill(1)));
  };

  const saveScenario = () => {
    if (!scenarioName.trim()) {
      toast({
        title: '错误',
        description: '请输入场景名称',
        variant: 'destructive'
      });
      return;
    }

    const newScenario: CustomScenario = {
      id: Date.now().toString(),
      name: scenarioName,
      description: scenarioDescription,
      board: board,
      difficulty: selectedDifficulty,
      goal: scenarioGoal,
      createdAt: new Date().toISOString()
    };

    const updated = [...savedScenarios, newScenario];
    setSavedScenarios(updated);
    localStorage.setItem('customScenarios', JSON.stringify(updated));

    toast({
      title: '保存成功',
      description: '自定义场景已保存'
    });

    // 重置编辑器
    setScenarioName('');
    setScenarioDescription('');
    setScenarioGoal('');
    clearBoard();
    setEditMode(false);
  };

  const deleteScenario = (id: string) => {
    const updated = savedScenarios.filter(s => s.id !== id);
    setSavedScenarios(updated);
    localStorage.setItem('customScenarios', JSON.stringify(updated));
    
    toast({
      title: '删除成功',
      description: '场景已删除'
    });
  };

  const exportScenario = (scenario: CustomScenario) => {
    const dataStr = JSON.stringify(scenario, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${scenario.name.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importScenario = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const scenario = JSON.parse(e.target?.result as string) as CustomScenario;
        scenario.id = Date.now().toString(); // 生成新ID
        
        const updated = [...savedScenarios, scenario];
        setSavedScenarios(updated);
        localStorage.setItem('customScenarios', JSON.stringify(updated));
        
        toast({
          title: '导入成功',
          description: '场景已导入'
        });
      } catch (err) {
        toast({
          title: '导入失败',
          description: '文件格式不正确',
          variant: 'destructive'
        });
      }
    };
    reader.readAsText(file);
  };

  const startCustomScenario = (scenario: CustomScenario) => {
    onGameStart('training', {
      gameMode: {
        id: `custom_${scenario.id}`,
        displayName: scenario.name,
        description: scenario.description,
        isTimeAttack: false
      },
      trainingType: 'custom',
      initialBoard: scenario.board,
      goal: scenario.goal,
      difficulty: scenario.difficulty
    });
  };

  return (
    <div className="space-y-6">
      {/* 编辑器面板 */}
      {editMode ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-green-500" />
              自定义关卡编辑器
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 左侧：游戏板编辑 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">游戏板编辑</h4>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearBoard}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      清空
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fillBoard}
                    >
                      <Grid3X3 className="w-3 h-3 mr-1" />
                      填充
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <Button
                    size="sm"
                    variant={selectedCell === 'empty' ? 'default' : 'outline'}
                    onClick={() => setSelectedCell('empty')}
                  >
                    空格
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedCell === 'filled' ? 'default' : 'outline'}
                    onClick={() => setSelectedCell('filled')}
                  >
                    方块
                  </Button>
                </div>

                {/* 游戏板网格 */}
                <div className="border-2 border-border rounded-lg p-2 bg-background inline-block">
                  <div className="grid gap-px bg-border" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
                    {board.map((row, rowIndex) => 
                      row.map((cell, colIndex) => (
                        <button
                          key={`${rowIndex}-${colIndex}`}
                          className={`w-6 h-6 transition-colors ${
                            cell === 1 
                              ? 'bg-primary hover:bg-primary/80' 
                              : 'bg-background hover:bg-muted'
                          }`}
                          onClick={() => toggleCell(rowIndex, colIndex)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 右侧：场景信息 */}
              <div className="space-y-4">
                <div>
                  <Label>场景名称</Label>
                  <Input
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    placeholder="例如：T-Spin设置练习"
                  />
                </div>

                <div>
                  <Label>场景描述</Label>
                  <Textarea
                    value={scenarioDescription}
                    onChange={(e) => setScenarioDescription(e.target.value)}
                    placeholder="描述这个场景的目的和玩法"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>训练目标</Label>
                  <Input
                    value={scenarioGoal}
                    onChange={(e) => setScenarioGoal(e.target.value)}
                    placeholder="例如：完成T-Spin Double"
                  />
                </div>

                <div>
                  <Label>难度等级</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {(['easy', 'medium', 'hard', 'expert'] as const).map((diff) => (
                      <Button
                        key={diff}
                        size="sm"
                        variant={selectedDifficulty === diff ? 'default' : 'outline'}
                        onClick={() => setSelectedDifficulty(diff)}
                      >
                        {diff === 'easy' ? '简单' : diff === 'medium' ? '中等' : diff === 'hard' ? '困难' : '专家'}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1 bg-green-500 hover:bg-green-600"
                    onClick={saveScenario}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    保存场景
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditMode(false)}
                  >
                    取消
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-green-500" />
                自定义关卡
              </CardTitle>
              <div className="flex gap-2">
                <label htmlFor="import-file">
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      导入
                    </span>
                  </Button>
                </label>
                <input
                  id="import-file"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={importScenario}
                />
                <Button
                  size="sm"
                  className="bg-green-500 hover:bg-green-600"
                  onClick={() => setEditMode(true)}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  创建新场景
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              创建自己的训练场景，设计特定的堆叠情况进行练习
            </p>

            {savedScenarios.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Edit3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>还没有自定义场景</p>
                <p className="text-sm">点击上方"创建新场景"开始制作</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedScenarios.map((scenario) => (
                  <Card key={scenario.id} className="border-2">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-lg mb-2">{scenario.name}</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {scenario.description}
                      </p>
                      {scenario.goal && (
                        <p className="text-sm mb-3">
                          <strong>目标:</strong> {scenario.goal}
                        </p>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-500 hover:bg-green-600"
                          onClick={() => startCustomScenario(scenario)}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          开始
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportScenario(scenario)}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteScenario(scenario.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 使用说明 */}
      {!editMode && (
        <Card>
          <CardHeader>
            <CardTitle>关于自定义关卡</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p>• <strong>创建场景</strong>: 点击"创建新场景"进入编辑器</p>
            <p>• <strong>编辑游戏板</strong>: 点击格子添加/删除方块，构建特定堆叠</p>
            <p>• <strong>设置目标</strong>: 定义训练目标，例如"完成T-Spin"或"清除所有行"</p>
            <p>• <strong>保存和分享</strong>: 保存场景到本地，或导出为文件分享给朋友</p>
            <p>• <strong>导入场景</strong>: 导入其他玩家创建的场景文件进行练习</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomScenarioEditor;
