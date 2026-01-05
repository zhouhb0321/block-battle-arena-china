
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface BattleRoom {
  id: string;
  participants: Map<string, WebSocket>;
  spectators: Map<string, WebSocket>; // 观战者
  gameState: Map<string, any>;
  mode: 'versus' | 'battle_royale' | 'league' | 'team_battle';
  currentMatch: number;
  scores: Map<string, number>;
  teamMode?: boolean;
  teamSize?: number;
  teams?: Map<string, 'A' | 'B'>;
  teamStats?: Map<'A' | 'B', { alive: number; totalScore: number; avgAPM: number }>;
}

class BattleManager {
  private rooms: Map<string, BattleRoom> = new Map();
  private supabase = createClient(supabaseUrl, supabaseServiceKey);

  async createRoom(roomId: string, mode: string): Promise<BattleRoom> {
    const room: BattleRoom = {
      id: roomId,
      participants: new Map(),
      spectators: new Map(), // 初始化观战者
      gameState: new Map(),
      mode: mode as any,
      currentMatch: 1,
      scores: new Map()
    };
    
    this.rooms.set(roomId, room);
    return room;
  }

  async joinRoom(roomId: string, userId: string, socket: WebSocket, asSpectator: boolean = false): Promise<boolean> {
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
      room.teamMode = roomData.team_mode || false;
      room.teamSize = roomData.team_size || 1;
      room.teams = new Map();
      room.teamStats = new Map([['A', { alive: 0, totalScore: 0, avgAPM: 0 }], ['B', { alive: 0, totalScore: 0, avgAPM: 0 }]]);
    }

    // 观战者逻辑
    if (asSpectator) {
      room.spectators.set(userId, socket);
      
      // 设置观战者消息处理
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        // 观战者只能发送有限的消息类型
        if (message.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', pingId: message.pingId }));
        } else if (message.type === 'request_sync') {
          // 发送当前游戏状态给观战者
          socket.send(JSON.stringify({
            type: 'spectator_sync',
            gameState: Object.fromEntries(room!.gameState),
            participants: [...room!.participants.keys()],
            spectators: room!.spectators.size
          }));
        }
      };

      socket.onclose = () => {
        room?.spectators.delete(userId);
        this.broadcastToRoom(roomId, {
          type: 'spectator_left',
          spectatorCount: room?.spectators.size || 0
        });
      };

      // 通知所有人有新观战者
      this.broadcastToRoom(roomId, {
        type: 'spectator_joined',
        spectatorCount: room.spectators.size
      });

      // 发送当前状态给观战者
      socket.send(JSON.stringify({
        type: 'spectator_init',
        gameState: Object.fromEntries(room.gameState),
        participants: [...room.participants.keys()].map(id => ({
          id,
          team: room!.teams?.get(id),
          alive: room!.gameState.get(id)?.alive !== false
        })),
        spectatorCount: room.spectators.size
      }));

      return true;
    }

    // 参与者逻辑
    const maxPlayers = room.teamMode ? (room.teamSize || 1) * 2 : (room.mode === 'versus' ? 2 : 8);
    if (room.participants.size >= maxPlayers) {
      return false;
    }

    // Assign team for team battle mode
    if (room.teamMode) {
      const teamACount = Array.from(room.teams?.values() || []).filter(team => team === 'A').length;
      const teamBCount = Array.from(room.teams?.values() || []).filter(team => team === 'B').length;
      const assignedTeam = teamACount <= teamBCount ? 'A' : 'B';
      room.teams?.set(userId, assignedTeam);
      
      // Update participant in database with team assignment
      await this.supabase
        .from('battle_participants')
        .update({ team: assignedTeam })
        .eq('room_id', roomId)
        .eq('user_id', userId);
    }

    room.participants.set(userId, socket);
    room.gameState.set(userId, { alive: true, score: 0, apm: 0, stackHeight: 0 });
    room.scores.set(userId, 0);

    // 设置WebSocket消息处理
    socket.onmessage = (event) => {
      this.handleMessage(roomId, userId, JSON.parse(event.data), socket);
    };

    socket.onclose = () => {
      this.leaveRoom(roomId, userId);
    };

    // 通知其他玩家有新玩家加入
    this.broadcastToRoom(roomId, {
      type: 'player_joined',
      userId,
      totalPlayers: room.participants.size,
      spectatorCount: room.spectators.size
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

  async handleMessage(roomId: string, userId: string, message: any, socket: WebSocket) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    switch (message.type) {
      // Ping/Pong for latency measurement
      case 'ping':
        socket.send(JSON.stringify({
          type: 'pong',
          pingId: message.pingId
        }));
        break;

      // Request state sync (for reconnection)
      case 'request_sync':
        const syncData = {
          type: 'sync_state',
          gameState: Object.fromEntries(room.gameState),
          scores: Object.fromEntries(room.scores),
          participants: [...room.participants.keys()].map(id => ({
            id,
            team: room.teams?.get(id),
            alive: room.gameState.get(id)?.alive !== false
          })),
          currentMatch: room.currentMatch,
          teamStats: room.teamStats ? Object.fromEntries(room.teamStats) : null
        };
        socket.send(JSON.stringify(syncData));
        break;

      case 'game_state_update':
        room.gameState.set(userId, message.data);
        this.broadcastToRoom(roomId, {
          type: 'opponent_state_update',
          userId,
          data: message.data
        }, userId);
        break;

      case 'team_state_update':
        room.gameState.set(userId, message.data);
        if (room.teamMode) {
          this.updateTeamStats(roomId);
        }
        this.broadcastToRoom(roomId, {
          type: 'team_state_update',
          userId,
          data: message.data,
          compressed: message.compressed
        }, userId);
        break;

      case 'attack':
        this.handleAttack(roomId, userId, message.data);
        break;

      case 'team_attack':
        this.handleTeamAttack(roomId, userId, message.data);
        break;

      case 'game_over':
        await this.handleGameOver(roomId, userId, message.data);
        break;

      case 'team_member_eliminated':
        await this.handleTeamMemberEliminated(roomId, userId, message.data);
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

  handleTeamAttack(roomId: string, fromUserId: string, attackData: any) {
    const room = this.rooms.get(roomId);
    if (!room || !room.teamMode) return;

    const fromTeam = room.teams?.get(fromUserId);
    if (!fromTeam) return;

    const opponentTeam = fromTeam === 'A' ? 'B' : 'A';
    const opponentPlayers = [...room.participants.keys()].filter(id => 
      room.teams?.get(id) === opponentTeam && room.gameState.get(id)?.alive
    );

    if (opponentPlayers.length === 0) return;

    const strategy = attackData.strategy || 'focus';
    let targets: string[] = [];

    switch (strategy) {
      case 'focus':
        // Target highest APM player
        const highestAPM = opponentPlayers.reduce((highest, playerId) => {
          const playerAPM = room.gameState.get(playerId)?.apm || 0;
          const currentHighestAPM = room.gameState.get(highest)?.apm || 0;
          return playerAPM > currentHighestAPM ? playerId : highest;
        }, opponentPlayers[0]);
        targets = [highestAPM];
        break;

      case 'random':
        // Random target
        targets = [opponentPlayers[Math.floor(Math.random() * opponentPlayers.length)]];
        break;

      case 'even':
        // Distribute evenly among all opponents
        targets = opponentPlayers;
        break;
    }

    // Distribute attack
    const linesPerTarget = strategy === 'even' ? Math.max(1, Math.floor(attackData.lines / targets.length)) : attackData.lines;
    
    targets.forEach(targetId => {
      const targetSocket = room.participants.get(targetId);
      if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
        targetSocket.send(JSON.stringify({
          type: 'receive_team_attack',
          data: {
            lines: linesPerTarget,
            fromTeam: fromTeam,
            fromUserId: fromUserId,
            strategy: strategy
          }
        }));
      }
    });
  }

  updateTeamStats(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || !room.teamMode || !room.teamStats) return;

    ['A', 'B'].forEach(team => {
      const teamPlayers = [...room.participants.keys()].filter(id => room.teams?.get(id) === team);
      const aliveCount = teamPlayers.filter(id => room.gameState.get(id)?.alive !== false).length;
      const totalScore = teamPlayers.reduce((sum, id) => sum + (room.gameState.get(id)?.score || 0), 0);
      const avgAPM = teamPlayers.length > 0 
        ? teamPlayers.reduce((sum, id) => sum + (room.gameState.get(id)?.apm || 0), 0) / teamPlayers.length 
        : 0;

      room.teamStats?.set(team as 'A' | 'B', { alive: aliveCount, totalScore, avgAPM });
    });
  }

  async handleTeamMemberEliminated(roomId: string, userId: string, gameData: any) {
    const room = this.rooms.get(roomId);
    if (!room || !room.teamMode) return;

    const userState = room.gameState.get(userId);
    if (userState) {
      userState.alive = false;
      userState.finalScore = gameData.finalScore || 0;
    }

    this.updateTeamStats(roomId);

    // Check if any team is completely eliminated
    const teamAAlive = room.teamStats?.get('A')?.alive || 0;
    const teamBAlive = room.teamStats?.get('B')?.alive || 0;

    if (teamAAlive === 0 || teamBAlive === 0) {
      const winningTeam = teamAAlive > 0 ? 'A' : 'B';
      await this.endTeamMatch(roomId, winningTeam);
    } else {
      this.broadcastToRoom(roomId, {
        type: 'team_member_eliminated',
        userId,
        remainingA: teamAAlive,
        remainingB: teamBAlive
      });
    }
  }

  async handleGameOver(roomId: string, userId: string, gameData: any) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.teamMode) {
      return this.handleTeamMemberEliminated(roomId, userId, gameData);
    }

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

  async endTeamMatch(roomId: string, winningTeam: 'A' | 'B') {
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

    // 记录团战结果
    const winningPlayers = [...room.participants.keys()].filter(id => room.teams?.get(id) === winningTeam);
    const losingPlayers = [...room.participants.keys()].filter(id => room.teams?.get(id) !== winningTeam);

    for (const winnerId of winningPlayers) {
      for (const loserId of losingPlayers) {
        await this.supabase
          .from('battle_records')
          .insert({
            room_id: roomId,
            match_number: 1,
            winner_id: winnerId,
            loser_id: loserId,
            winner_score: room.gameState.get(winnerId)?.finalScore || 0,
            loser_score: room.gameState.get(loserId)?.finalScore || 0,
            duration_seconds: 0,
            attack_sent: 0,
            attack_received: 0,
            lines_cleared: 0
          });
      }
    }

    this.broadcastToRoom(roomId, {
      type: 'team_victory',
      winningTeam: winningTeam,
      teamStats: Object.fromEntries(room.teamStats || [])
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
    
    // 广播给参与者
    room.participants.forEach((socket, odId) => {
      if (odId !== excludeUserId && socket.readyState === WebSocket.OPEN) {
        socket.send(messageStr);
      }
    });

    // 同时广播给观战者（除了某些私密消息）
    if (!message.type?.includes('private')) {
      room.spectators.forEach((socket) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(messageStr);
        }
      });
    }
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
  const odId = url.searchParams.get('userId');
  const spectator = url.searchParams.get('spectator') === 'true';

  if (!roomId || !odId) {
    return new Response("Missing roomId or userId", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = async () => {
    console.log(`User ${odId} joining room ${roomId} as ${spectator ? 'spectator' : 'participant'}`);
    const joined = await battleManager.joinRoom(roomId, odId, socket, spectator);
    if (!joined) {
      socket.close(1000, "Failed to join room");
    }
  };

  return response;
});
