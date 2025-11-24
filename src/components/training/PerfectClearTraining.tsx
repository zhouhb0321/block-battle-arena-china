import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Play } from 'lucide-react';

interface PerfectClearTrainingProps {
  onGameStart: (gameType: string, gameMode: any) => void;
}

// Perfect Clear训练场景
const PERFECT_CLEAR_SCENARIOS = [
  {
    id: 'pc_4line',
    name: '4行PC基础',
    difficulty: 'easy',
    description: '学习最基础的4行Perfect Clear',
    initialBoard: [
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [1,1,1,1,0,0,0,0,1,1],
      [1,1,1,1,0,0,0,0,1,1],
      [1,1,1,1,0,0,0,0,1,1],
      [1,1,1,1,0,0,0,0,1,1],
    ],
    targetPieces: ['I', 'O'],
    goal: '完成4行Perfect Clear',
    targetMoves: 2
  },
  {
    id: 'pc_6line',
    name: '6行PC进阶',
    difficulty: 'medium',
    description: '练习6行Perfect Clear设置',
    initialBoard: [
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [1,1,1,0,0,0,0,1,1,1],
      [1,1,1,0,0,0,0,1,1,1],
      [1,1,1,0,0,0,0,1,1,1],
      [1,1,1,0,0,0,0,1,1,1],
      [1,1,1,1,0,0,1,1,1,1],
      [1,1,1,1,0,0,1,1,1,1],
    ],
    targetPieces: ['I', 'T', 'L', 'J'],
    goal: '完成6行Perfect Clear',
    targetMoves: 4
  },
  {
    id: 'pc_opening',
    name: 'PC开局',
    difficulty: 'hard',
    description: '学习经典的PC开局技巧（前7块PC）',
    initialBoard: Array(20).fill(null).map(() => Array(10).fill(0)),
    targetPieces: ['I', 'O', 'T', 'S', 'Z', 'L', 'J'],
    goal: '7块完成PC开局',
    targetMoves: 7
  },
  {
    id: 'pc_continuous',
    name: '连续PC',
    difficulty: 'expert',
    description: '挑战连续Perfect Clear（需要精确规划）',
    initialBoard: Array(20).fill(null).map(() => Array(10).fill(0)),
    targetPieces: ['I', 'O', 'T', 'S', 'Z', 'L', 'J'],
    goal: '连续完成2次PC',
    targetMoves: 14
  }
];

const PerfectClearTraining: React.FC<PerfectClearTrainingProps> = ({ onGameStart }) => {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-orange-500';
      case 'expert': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      case 'expert': return '专家';
      default: return difficulty;
    }
  };

  const startTraining = (scenario: typeof PERFECT_CLEAR_SCENARIOS[0]) => {
    onGameStart('training', {
      gameMode: {
        id: `pc_training_${scenario.id}`,
        displayName: scenario.name,
        description: scenario.description,
        isTimeAttack: false
      },
      trainingType: 'perfect_clear',
      initialBoard: scenario.initialBoard,
      targetPieces: scenario.targetPieces,
      goal: scenario.goal,
      targetMoves: scenario.targetMoves
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          Perfect Clear专项训练
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          掌握Perfect Clear技巧，学会清空整个游戏板
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PERFECT_CLEAR_SCENARIOS.map((scenario) => (
            <Card 
              key={scenario.id}
              className={`border-2 transition-all cursor-pointer hover:shadow-lg ${
                selectedScenario === scenario.id 
                  ? 'border-yellow-400 bg-yellow-50' 
                  : 'border-border hover:border-yellow-200'
              }`}
              onClick={() => setSelectedScenario(scenario.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{scenario.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {scenario.description}
                    </p>
                  </div>
                  <Badge className={`${getDifficultyColor(scenario.difficulty)} text-white`}>
                    {getDifficultyLabel(scenario.difficulty)}
                  </Badge>
                </div>
                
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">目标:</span>
                    <span className="font-medium">{scenario.goal}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">目标步数:</span>
                    <span className="font-medium">{scenario.targetMoves}步</span>
                  </div>
                </div>

                <Button
                  className="w-full mt-4 bg-yellow-500 hover:bg-yellow-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    startTraining(scenario);
                  }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  开始训练
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Perfect Clear说明</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• <strong>什么是PC</strong>: 消除后游戏板完全清空，没有任何方块剩余</li>
            <li>• <strong>得分奖励</strong>: PC会获得巨额分数加成和额外攻击力</li>
            <li>• <strong>开局PC</strong>: 使用前7个方块完成PC，是高级玩家的标志</li>
            <li>• <strong>连续PC</strong>: 持续完成PC可以形成强大的攻击压制</li>
            <li>• <strong>常见模式</strong>: 4行PC最容易，6行PC较常用，10行PC极难</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerfectClearTraining;
