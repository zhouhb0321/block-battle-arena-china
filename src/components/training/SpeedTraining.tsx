import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Play, Clock, Target } from 'lucide-react';

interface SpeedTrainingProps {
  onGameStart: (gameType: string, gameMode: any) => void;
}

// 速度训练场景
const SPEED_TRAINING_SCENARIOS = [
  {
    id: 'speed_40l_beginner',
    name: '40行入门',
    difficulty: 'easy',
    description: '适合新手的40行冲刺，降低难度',
    mode: 'sprint40',
    timeTarget: 120, // 2分钟目标
    ppsTarget: 0.8,
    gravityLevel: 1,
    startingLevel: 1
  },
  {
    id: 'speed_40l_intermediate',
    name: '40行进阶',
    difficulty: 'medium',
    description: '标准40行冲刺，提升速度',
    mode: 'sprint40',
    timeTarget: 90, // 1.5分钟目标
    ppsTarget: 1.5,
    gravityLevel: 3,
    startingLevel: 5
  },
  {
    id: 'speed_40l_advanced',
    name: '40行高级',
    difficulty: 'hard',
    description: '高速40行冲刺，挑战极限',
    mode: 'sprint40',
    timeTarget: 60, // 1分钟目标
    ppsTarget: 2.5,
    gravityLevel: 5,
    startingLevel: 10
  },
  {
    id: 'speed_100l',
    name: '100行冲刺',
    difficulty: 'hard',
    description: '耐力与速度的双重考验',
    mode: 'sprint100',
    timeTarget: 180, // 3分钟目标
    ppsTarget: 2.0,
    gravityLevel: 4,
    startingLevel: 8
  },
  {
    id: 'speed_blitz',
    name: '闪电模式',
    difficulty: 'expert',
    description: '极速模式，重力x2，测试反应速度',
    mode: 'sprint40',
    timeTarget: 45, // 45秒目标
    ppsTarget: 3.5,
    gravityLevel: 10,
    startingLevel: 15
  },
  {
    id: 'speed_cheese',
    name: 'Cheese Race',
    difficulty: 'expert',
    description: '底部带有垃圾行，快速清除',
    mode: 'cheese',
    timeTarget: 75,
    ppsTarget: 2.8,
    gravityLevel: 5,
    startingLevel: 10,
    initialGarbageLines: 10
  }
];

const SpeedTraining: React.FC<SpeedTrainingProps> = ({ onGameStart }) => {
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}秒`;
  };

  const startTraining = (scenario: typeof SPEED_TRAINING_SCENARIOS[0]) => {
    onGameStart('training', {
      gameMode: {
        id: `speed_training_${scenario.id}`,
        displayName: scenario.name,
        description: scenario.description,
        isTimeAttack: scenario.mode.includes('sprint'),
        targetLines: scenario.mode === 'sprint40' ? 40 : scenario.mode === 'sprint100' ? 100 : 40
      },
      trainingType: 'speed',
      timeTarget: scenario.timeTarget,
      ppsTarget: scenario.ppsTarget,
      gravityLevel: scenario.gravityLevel,
      startingLevel: scenario.startingLevel,
      initialGarbageLines: scenario.initialGarbageLines || 0
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-500" />
          速度专项训练
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          通过不同难度的计时挑战，提升操作速度和反应能力
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SPEED_TRAINING_SCENARIOS.map((scenario) => (
            <Card 
              key={scenario.id}
              className={`border-2 transition-all cursor-pointer hover:shadow-lg ${
                selectedScenario === scenario.id 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-border hover:border-blue-200'
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
                </div>

                <Badge className={`${getDifficultyColor(scenario.difficulty)} text-white mb-3`}>
                  {getDifficultyLabel(scenario.difficulty)}
                </Badge>
                
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      目标时间:
                    </span>
                    <span className="font-medium">{formatTime(scenario.timeTarget)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Target className="w-3 h-3" />
                      目标PPS:
                    </span>
                    <span className="font-medium">{scenario.ppsTarget.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Zap className="w-3 h-3" />
                      重力等级:
                    </span>
                    <span className="font-medium">Lv.{scenario.gravityLevel}</span>
                  </div>
                </div>

                <Button
                  className="w-full bg-blue-500 hover:bg-blue-600"
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
          <h4 className="font-semibold mb-2">速度训练技巧</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• <strong>PPS (Pieces Per Second)</strong>: 每秒放置方块数，衡量速度的关键指标</li>
            <li>• <strong>减少思考时间</strong>: 提前观察Next块，在当前块下落时就规划位置</li>
            <li>• <strong>优化操作</strong>: 使用Finesse（最优操作），减少不必要的按键</li>
            <li>• <strong>保持平整</strong>: 速度模式下堆叠平整度比技巧更重要</li>
            <li>• <strong>适应重力</strong>: 高重力等级下需要更快的反应和预判能力</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold mb-2 text-blue-700">速度目标参考</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">新手:</span>
              <span className="ml-2 font-medium">PPS &lt; 1.0</span>
            </div>
            <div>
              <span className="text-muted-foreground">中级:</span>
              <span className="ml-2 font-medium">PPS 1.0-2.0</span>
            </div>
            <div>
              <span className="text-muted-foreground">高级:</span>
              <span className="ml-2 font-medium">PPS 2.0-3.5</span>
            </div>
            <div>
              <span className="text-muted-foreground">专家:</span>
              <span className="ml-2 font-medium">PPS &gt; 3.5</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpeedTraining;
