
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface BattleRoom {
  id: string;
  participants: Map<string, WebSocket>;
  gameState: Map<string, any>;
  mode: 'versus' | 'battle_royale' | 'league';
  currentMatch: number;
  scores: Map<string, number>;
}

class BattleManager {
  private rooms: Map<string, BattleRoom> = new Map();
  private supabase = createClient(supabaseUrl, supabaseServiceKey);

  async createRoom(roomId: string, mode: string): Promise<BattleRoom> {
    const room: BattleRoom = {
      id: roomId,
      participants: new Map(),
      gameState: new Map(),
      mode: mode as any,
      currentMatch: 1,
      scores: new Map()
    };
    
    this.rooms.set(roomId, room);
    return room;
  }

  async joinRoom(roomId: string, userId: string, socket: WebSocket): Promise<boolean> {
    let room = this.rooms.get(roomId);
    
    if (!room) {
      // 从数据库获取房间信息
      const { data: roomData } = await this.supabase
        .from('battle_rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (!roomData) return false;
      
      room = await this.createRoom(roomId, roomData.mode);
    }

    if (room.participants.size >= (room.mode === 'versus' ? 2 : 8)) {
      return false;
    }

    room.participants.set(userId, socket);
    room.gameState.set(userId, { alive: true, score: 0 });
    room.scores.set(userId, 0);

    // 设置WebSocket消息处理
    socket.onmessage = (event) => {
      this.handleMessage(roomId, userId, JSON.parse(event.data));
    };

    socket.onclose = () => {
      this.leaveRoom(roomId, userId);
    };

    // 通知其他玩家有新玩家加入
    this.broadcastToRoom(roomId, {
      type: 'player_joined',
      userId,
      totalPlayers: room.participants.size
    }, userId);

    // 如果房间满了，开始游戏
    if (room.participants.size === (room.mode === 'versus' ? 2 : room.participants.size >= 2)) {
      this.startGame(roomId);
    }

    return true;
  }

  leaveRoom(roomId: string, userId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.participants.delete(userId);
    room.gameState.delete(userId);
    room.scores.delete(userId);

    this.broadcastToRoom(roomId, {
      type: 'player_left',
      userId,
      totalPlayers: room.participants.size
    });

    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  async handleMessage(roomId: string, userId: string, message: any) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    switch (message.type) {
      case 'game_state_update':
        room.gameState.set(userId, message.data);
        this.broadcastToRoom(roomId, {
          type: 'opponent_state_update',
          userId,
          data: message.data
        }, userId);
        break;

      case 'attack':
        this.handleAttack(roomId, userId, message.data);
        break;

      case 'game_over':
        await this.handleGameOver(roomId, userId, message.data);
        break;

      case 'replay_data':
        await this.saveReplayData(roomId, userId, message.data);
        break;
    }
  }

  handleAttack(roomId: string, fromUserId: string, attackData: any) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    let targetUserId: string;

    if (room.mode === 'versus') {
      // 1v1模式：攻击对手
      targetUserId = [...room.participants.keys()].find(id => id !== fromUserId)!;
    } else {
      // 多人混战模式：随机选择幸存的对手
      const alivePlayers = [...room.participants.keys()].filter(id => 
        id !== fromUserId && room.gameState.get(id)?.alive
      );
      
      if (alivePlayers.length === 0) return;
      
      targetUserId = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    }

    const targetSocket = room.participants.get(targetUserId);
    if (targetSocket) {
      targetSocket.send(JSON.stringify({
        type: 'receive_attack',
        data: attackData,
        from: fromUserId
      }));
    }
  }

  async handleGameOver(roomId: string, userId: string, gameData: any) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const userState = room.gameState.get(userId);
    if (userState) {
      userState.alive = false;
      userState.finalScore = gameData.score;
    }

    if (room.mode === 'versus') {
      // 联盟模式：5局3胜制
      const opponentId = [...room.participants.keys()].find(id => id !== userId)!;
      const currentScore = room.scores.get(opponentId) || 0;
      room.scores.set(opponentId, currentScore + 1);

      // 记录单局结果
      await this.supabase
        .from('battle_records')
        .insert({
          room_id: roomId,
          match_number: room.currentMatch,
          winner_id: opponentId,
          loser_id: userId,
          winner_score: gameData.opponentScore || 0,
          loser_score: gameData.score,
          duration_seconds: gameData.duration,
          attack_sent: gameData.attackSent || 0,
          attack_received: gameData.attackReceived || 0,
          lines_cleared: gameData.lines || 0
        });

      const opponentScore = room.scores.get(opponentId) || 0;
      const userScore = room.scores.get(userId) || 0;

      // 检查是否有人获得3胜
      if (opponentScore >= 3 || userScore >= 3) {
        await this.endMatch(roomId, opponentScore >= 3 ? opponentId : userId);
      } else {
        room.currentMatch++;
        this.broadcastToRoom(roomId, {
          type: 'match_result',
          winner: opponentId,
          scores: Object.fromEntries(room.scores),
          nextMatch: room.currentMatch
        });
      }
    } else {
      // 多人混战模式
      const alivePlayers = [...room.participants.keys()].filter(id => 
        room.gameState.get(id)?.alive
      );

      if (alivePlayers.length <= 1) {
        const winner = alivePlayers[0];
        await this.endMatch(roomId, winner);
      } else {
        this.broadcastToRoom(roomId, {
          type: 'player_eliminated',
          eliminatedPlayer: userId,
          remainingPlayers: alivePlayers.length
        });
      }
    }
  }

  async endMatch(roomId: string, winnerId?: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // 更新数据库中的房间状态
    await this.supabase
      .from('battle_rooms')
      .update({
        status: 'finished',
        finished_at: new Date().toISOString()
      })
      .eq('id', roomId);

    // 更新联盟排名（如果是联盟模式）
    if (room.mode === 'league' && winnerId) {
      await this.updateLeagueRankings(winnerId, [...room.participants.keys()].filter(id => id !== winnerId)[0]);
    }

    this.broadcastToRoom(roomId, {
      type: 'match_ended',
      winner: winnerId,
      finalScores: Object.fromEntries(room.scores)
    });

    // 清理房间
    this.rooms.delete(roomId);
  }

  async updateLeagueRankings(winnerId: string, loserId: string) {
    // 获取当前赛季
    const { data: currentSeason } = await this.supabase
      .from('league_seasons')
      .select('*')
      .eq('status', 'active')
      .single();

    if (!currentSeason) return;

    // 更新胜者排名
    await this.supabase.rpc('update_league_ranking', {
      p_season_id: currentSeason.id,
      p_user_id: winnerId,
      p_won: true
    });

    // 更新败者排名
    await this.supabase.rpc('update_league_ranking', {
      p_season_id: currentSeason.id,
      p_user_id: loserId,
      p_won: false
    });
  }

  async saveReplayData(roomId: string, userId: string, replayData: any) {
    try {
      await this.supabase
        .from('game_replays')
        .insert({
          user_id: userId,
          room_id: roomId,
          game_mode: replayData.gameMode || 'multiplayer',
          final_score: replayData.finalScore || 0,
          final_lines: replayData.finalLines || 0,
          duration: replayData.duration || 0,
          pps: replayData.pps || 0,
          apm: replayData.apm || 0,
          replay_data: replayData.actions || [],
          metadata: {
            gameSettings: replayData.gameSettings,
            timestamp: new Date().toISOString()
          }
        });
    } catch (error) {
      console.error('Failed to save replay data:', error);
    }
  }

  broadcastToRoom(roomId: string, message: any, excludeUserId?: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);
    
    room.participants.forEach((socket, userId) => {
      if (userId !== excludeUserId && socket.readyState === WebSocket.OPEN) {
        socket.send(messageStr);
      }
    });
  }

  startGame(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // 生成统一的游戏种子确保同步
    const gameSeed = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.broadcastToRoom(roomId, {
      type: 'game_start',
      countdown: 3,
      seed: gameSeed,
      syncTime: Date.now()
    });
  }
}

const battleManager = new BattleManager();

serve(async (req) => {
  const upgrade = req.headers.get("upgrade") || "";
  
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 426 });
  }

  const url = new URL(req.url);
  const roomId = url.searchParams.get('roomId');
  const userId = url.searchParams.get('userId');

  if (!roomId || !userId) {
    return new Response("Missing roomId or userId", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = async () => {
    const joined = await battleManager.joinRoom(roomId, userId, socket);
    if (!joined) {
      socket.close(1000, "Failed to join room");
    }
  };

  return response;
});
