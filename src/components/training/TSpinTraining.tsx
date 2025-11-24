import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Play } from 'lucide-react';

interface TSpinTrainingProps {
  onGameStart: (gameType: string, gameMode: any) => void;
}

// T-Spin训练场景定义
const T_SPIN_SCENARIOS = [
  {
    id: 'tspin_basic',
    name: 'T-Spin基础',
    difficulty: 'easy',
    description: '学习基础T-Spin设置和执行',
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
      [1,1,1,0,0,0,1,1,1,1],
      [1,1,1,0,0,0,1,1,1,1],
      [1,1,1,1,0,0,1,1,1,1],
      [1,1,1,1,0,1,1,1,1,1],
    ],
    targetPieces: ['T'],
    goal: '执行T-Spin Single',
    targetMoves: 1
  },
  {
    id: 'tspin_double',
    name: 'T-Spin Double',
    difficulty: 'medium',
    description: '练习T-Spin Double设置',
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
      [1,1,1,0,0,0,1,1,1,1],
      [1,1,1,0,0,0,1,1,1,1],
      [1,1,1,1,0,0,1,1,1,1],
      [1,1,1,1,0,0,1,1,1,1],
    ],
    targetPieces: ['T'],
    goal: '执行T-Spin Double',
    targetMoves: 1
  },
  {
    id: 'tspin_triple',
    name: 'T-Spin Triple',
    difficulty: 'hard',
    description: '挑战T-Spin Triple（罕见技巧）',
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
      [1,1,1,0,0,0,1,1,1,1],
      [1,1,1,0,0,0,1,1,1,1],
      [1,1,1,0,0,0,1,1,1,1],
      [1,1,1,1,0,0,1,1,1,1],
    ],
    targetPieces: ['T'],
    goal: '执行T-Spin Triple',
    targetMoves: 1
  },
  {
    id: 'tspin_setup',
    name: 'T-Spin快速设置',
    difficulty: 'expert',
    description: '在实战堆叠中快速构建T-Spin机会',
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
      [1,0,0,0,0,0,0,0,0,1],
      [1,1,0,0,0,0,0,0,1,1],
      [1,1,1,0,0,0,0,1,1,1],
      [1,1,1,1,0,0,1,1,1,1],
      [1,1,1,1,1,0,1,1,1,1],
      [1,1,1,1,1,0,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1],
    ],
    targetPieces: ['I', 'O', 'S', 'Z', 'L', 'J', 'T'],
    goal: '构建并执行连续T-Spin',
    targetMoves: 5
  }
];

const TSpinTraining: React.FC<TSpinTrainingProps> = ({ onGameStart }) => {
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

  const startTraining = (scenario: typeof T_SPIN_SCENARIOS[0]) => {
    onGameStart('training', {
      gameMode: {
        id: `tspin_training_${scenario.id}`,
        displayName: scenario.name,
        description: scenario.description,
        isTimeAttack: false
      },
      trainingType: 'tspin',
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
          <Target className="w-5 h-5 text-purple-500" />
          T-Spin专项训练
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          通过精心设计的场景，循序渐进地掌握T-Spin技巧
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {T_SPIN_SCENARIOS.map((scenario) => (
            <Card 
              key={scenario.id}
              className={`border-2 transition-all cursor-pointer hover:shadow-lg ${
                selectedScenario === scenario.id 
                  ? 'border-purple-400 bg-purple-50' 
                  : 'border-border hover:border-purple-200'
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
                  className="w-full mt-4 bg-purple-500 hover:bg-purple-600"
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
          <h4 className="font-semibold mb-2">T-Spin技巧说明</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• <strong>T-Spin Single</strong>: 旋转T块清除1行，得分高于普通消行</li>
            <li>• <strong>T-Spin Double</strong>: 旋转T块清除2行，是最常见的T-Spin形式</li>
            <li>• <strong>T-Spin Triple</strong>: 旋转T块清除3行，难度高但得分最高</li>
            <li>• <strong>T-Spin识别</strong>: T块放置后，四个角中至少3个被占据即可触发</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default TSpinTraining;
