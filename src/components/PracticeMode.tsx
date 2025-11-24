import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Bot, Target, Zap, Edit3 } from 'lucide-react';
import BotManager from '@/components/BotManager';
import TSpinTraining from '@/components/training/TSpinTraining';
import PerfectClearTraining from '@/components/training/PerfectClearTraining';
import SpeedTraining from '@/components/training/SpeedTraining';
import CustomScenarioEditor from '@/components/training/CustomScenarioEditor';

interface PracticeModeProps {
  onGameStart: (gameType: string, gameMode: any) => void;
  onBack: () => void;
}

const PracticeMode: React.FC<PracticeModeProps> = ({ onGameStart, onBack }) => {
  const [activeTab, setActiveTab] = useState('ai-practice');

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={onBack} className="mr-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <h2 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Target className="w-8 h-8" />
          练习模式
        </h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="ai-practice" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            AI陪练
          </TabsTrigger>
          <TabsTrigger value="special-training" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            专项训练
          </TabsTrigger>
          <TabsTrigger value="speed-training" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            速度训练
          </TabsTrigger>
          <TabsTrigger value="custom-scenarios" className="flex items-center gap-2">
            <Edit3 className="w-4 h-4" />
            自定义关卡
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-practice">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                AI陪练系统
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                与不同难度的AI对手进行对战练习，提升实战能力
              </p>
              <BotManager 
                onBotJoin={(botId) => console.log('Bot joined:', botId)}
                onBotLeave={(botId) => console.log('Bot left:', botId)}
              />
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2 border-green-200 hover:border-green-400 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-2xl">🤖</div>
                      <div>
                        <h4 className="font-semibold">基础练习</h4>
                        <p className="text-sm text-muted-foreground">与简单AI对战</p>
                      </div>
                    </div>
                    <Button 
                      className="w-full mt-2 bg-green-500 hover:bg-green-600"
                      onClick={() => onGameStart('practice', {
                        gameMode: { id: 'ai_practice_easy', displayName: 'AI陪练 - 简单', isTimeAttack: false },
                        botDifficulty: 'easy'
                      })}
                    >
                      开始练习
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-yellow-200 hover:border-yellow-400 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-2xl">🔵</div>
                      <div>
                        <h4 className="font-semibold">进阶练习</h4>
                        <p className="text-sm text-muted-foreground">与中等AI对战</p>
                      </div>
                    </div>
                    <Button 
                      className="w-full mt-2 bg-yellow-500 hover:bg-yellow-600"
                      onClick={() => onGameStart('practice', {
                        gameMode: { id: 'ai_practice_medium', displayName: 'AI陪练 - 中等', isTimeAttack: false },
                        botDifficulty: 'medium'
                      })}
                    >
                      开始练习
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-200 hover:border-orange-400 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-2xl">🔴</div>
                      <div>
                        <h4 className="font-semibold">高级练习</h4>
                        <p className="text-sm text-muted-foreground">与困难AI对战</p>
                      </div>
                    </div>
                    <Button 
                      className="w-full mt-2 bg-orange-500 hover:bg-orange-600"
                      onClick={() => onGameStart('practice', {
                        gameMode: { id: 'ai_practice_hard', displayName: 'AI陪练 - 困难', isTimeAttack: false },
                        botDifficulty: 'hard'
                      })}
                    >
                      开始练习
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-red-200 hover:border-red-400 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-2xl">👑</div>
                      <div>
                        <h4 className="font-semibold">专家挑战</h4>
                        <p className="text-sm text-muted-foreground">与专家AI对战</p>
                      </div>
                    </div>
                    <Button 
                      className="w-full mt-2 bg-red-500 hover:bg-red-600"
                      onClick={() => onGameStart('practice', {
                        gameMode: { id: 'ai_practice_expert', displayName: 'AI陪练 - 专家', isTimeAttack: false },
                        botDifficulty: 'expert'
                      })}
                    >
                      开始练习
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="special-training">
          <div className="space-y-6">
            <TSpinTraining onGameStart={onGameStart} />
            <PerfectClearTraining onGameStart={onGameStart} />
          </div>
        </TabsContent>

        <TabsContent value="speed-training">
          <SpeedTraining onGameStart={onGameStart} />
        </TabsContent>

        <TabsContent value="custom-scenarios">
          <CustomScenarioEditor onGameStart={onGameStart} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PracticeMode;
