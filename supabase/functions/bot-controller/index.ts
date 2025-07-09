
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BotConfig {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  pps: number;
  apm: number;
  thinkTime: number; // AI思考时间(ms)
  errorRate: number; // 错误率(0-1)
}

const BOT_CONFIGS: Record<string, BotConfig> = {
  'bot-novice': {
    id: 'bot-novice',
    name: 'Novice Bot',
    difficulty: 'easy',
    pps: 1.2,
    apm: 80,
    thinkTime: 800,
    errorRate: 0.15
  },
  'bot-casual': {
    id: 'bot-casual',
    name: 'Casual Bot',
    difficulty: 'medium',
    pps: 2.5,
    apm: 140,
    thinkTime: 400,
    errorRate: 0.08
  },
  'bot-competitive': {
    id: 'bot-competitive',
    name: 'Competitive Bot',
    difficulty: 'hard',
    pps: 4.2,
    apm: 220,
    thinkTime: 200,
    errorRate: 0.03
  },
  'bot-master': {
    id: 'bot-master',
    name: 'Master Bot',
    difficulty: 'expert',
    pps: 6.8,
    apm: 350,
    thinkTime: 100,
    errorRate: 0.01
  }
};

// 简化的AI决策系统
class TetrisBot {
  private config: BotConfig;
  private board: number[][];
  private currentPiece: any;
  private gameState: any;
  private isActive: boolean = false;

  constructor(config: BotConfig) {
    this.config = config;
    this.board = Array(23).fill(null).map(() => Array(10).fill(0));
  }

  // 评估棋盘状态
  private evaluateBoard(board: number[][]): number {
    let score = 0;
    
    // 计算高度惩罚
    for (let col = 0; col < 10; col++) {
      for (let row = 0; row < 23; row++) {
        if (board[row][col] !== 0) {
          score -= (23 - row) * 2; // 越高惩罚越大
          break;
        }
      }
    }
    
    // 计算洞的数量
    let holes = 0;
    for (let col = 0; col < 10; col++) {
      let foundBlock = false;
      for (let row = 0; row < 23; row++) {
        if (board[row][col] !== 0) {
          foundBlock = true;
        } else if (foundBlock) {
          holes++;
        }
      }
    }
    score -= holes * 50;
    
    // 计算完整行数
    let completeLines = 0;
    for (let row = 0; row < 23; row++) {
      if (board[row].every(cell => cell !== 0)) {
        completeLines++;
      }
    }
    score += completeLines * 100;
    
    return score;
  }

  // 生成可能的移动
  private generateMoves(piece: any): Array<{x: number, y: number, rotation: number}> {
    const moves = [];
    
    // 尝试所有旋转状态
    for (let rotation = 0; rotation < 4; rotation++) {
      // 尝试所有水平位置
      for (let x = -2; x < 12; x++) {
        // 找到最低可放置位置
        for (let y = 0; y < 25; y++) {
          if (this.isValidPosition(piece, x, y, rotation)) {
            moves.push({x, y, rotation});
          } else {
            break;
          }
        }
      }
    }
    
    return moves;
  }

  // 检查位置是否有效（简化版）
  private isValidPosition(piece: any, x: number, y: number, rotation: number): boolean {
    // 简化的有效性检查
    return x >= 0 && x < 10 && y >= 0 && y < 23;
  }

  // AI决策主函数
  async makeMove(): Promise<any> {
    if (!this.currentPiece || !this.isActive) return null;

    // 添加思考延迟
    await new Promise(resolve => setTimeout(resolve, this.config.thinkTime));

    const moves = this.generateMoves(this.currentPiece);
    let bestMove = null;
    let bestScore = -Infinity;

    // 评估每个可能的移动
    for (const move of moves) {
      const testBoard = this.simulateMove(this.board, this.currentPiece, move);
      const score = this.evaluateBoard(testBoard);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    // 添加错误率
    if (Math.random() < this.config.errorRate && moves.length > 1) {
      bestMove = moves[Math.floor(Math.random() * moves.length)];
    }

    return bestMove;
  }

  // 模拟移动
  private simulateMove(board: number[][], piece: any, move: any): number[][] {
    const newBoard = board.map(row => [...row]);
    // 简化的模拟放置逻辑
    return newBoard;
  }

  // 启动Bot
  start() {
    this.isActive = true;
    console.log(`Bot ${this.config.name} started`);
  }

  // 停止Bot
  stop() {
    this.isActive = false;
    console.log(`Bot ${this.config.name} stopped`);
  }

  // 更新游戏状态
  updateGameState(state: any) {
    this.gameState = state;
    this.board = state.board || this.board;
    this.currentPiece = state.currentPiece;
  }
}

// Bot实例管理
const activeBots = new Map<string, TetrisBot>();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, botId, roomId, gameState } = await req.json();

    switch (action) {
      case 'start':
        if (!BOT_CONFIGS[botId]) {
          throw new Error(`Bot config not found: ${botId}`);
        }

        const bot = new TetrisBot(BOT_CONFIGS[botId]);
        activeBots.set(`${botId}-${roomId}`, bot);
        bot.start();

        // 启动Bot游戏循环
        startBotGameLoop(bot, botId, roomId, supabase);

        return new Response(
          JSON.stringify({ success: true, message: `Bot ${botId} started in room ${roomId}` }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );

      case 'stop':
        const botKey = `${botId}-${roomId}`;
        const existingBot = activeBots.get(botKey);
        if (existingBot) {
          existingBot.stop();
          activeBots.delete(botKey);
        }

        return new Response(
          JSON.stringify({ success: true, message: `Bot ${botId} stopped` }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );

      case 'update':
        const updateBot = activeBots.get(`${botId}-${roomId}`);
        if (updateBot) {
          updateBot.updateGameState(gameState);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Bot controller error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

// Bot游戏循环
async function startBotGameLoop(bot: TetrisBot, botId: string, roomId: string, supabase: any) {
  const gameLoop = async () => {
    try {
      const move = await bot.makeMove();
      if (move) {
        // 发送Bot的移动到WebSocket
        await supabase.functions.invoke('battle-websocket', {
          body: {
            type: 'bot_move',
            data: {
              botId,
              roomId,
              move,
              timestamp: Date.now()
            }
          }
        });
      }
    } catch (error) {
      console.error('Bot game loop error:', error);
    }

    // 根据Bot配置的速度继续循环
    const config = BOT_CONFIGS[botId];
    if (config && activeBots.has(`${botId}-${roomId}`)) {
      setTimeout(gameLoop, 1000 / config.pps);
    }
  };

  // 启动游戏循环
  gameLoop();
}
