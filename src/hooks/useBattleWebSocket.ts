
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface BattleWebSocketMessage {
  type: string;
  data?: any;
  userId?: string;
  from?: string;
  seed?: string;
  countdown?: number;
  syncTime?: number;
  participants?: any[];
  winningTeam?: 'A' | 'B';
  remainingA?: number;
  remainingB?: number;
  totalPlayers?: number;
  compressed?: boolean;
  pingId?: string; // 用于 ping 响应匹配
}

export interface ConnectionStatus {
  isConnected: boolean;
  ping: number | null;
  reconnecting: boolean;
  reconnectAttempt: number;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
}

export interface BattleWebSocketHook {
  socket: WebSocket | null;
  isConnected: boolean;
  ping: number | null;
  connectionStatus: ConnectionStatus;
  sendMessage: (message: BattleWebSocketMessage) => void;
  lastMessage: BattleWebSocketMessage | null;
  connect: (roomId: string) => void;
  disconnect: () => void;
  requestStateSync: () => void; // 请求状态同步
}

// Ping 测量间隔 (ms)
const PING_INTERVAL = 3000;
// 最大重连次数
const MAX_RECONNECT_ATTEMPTS = 5;
// 重连基础延迟 (ms)
const RECONNECT_BASE_DELAY = 1000;

export const useBattleWebSocket = (): BattleWebSocketHook => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [ping, setPing] = useState<number | null>(null);
  const [lastMessage, setLastMessage] = useState<BattleWebSocketMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    ping: null,
    reconnecting: false,
    reconnectAttempt: 0,
    lastConnectedAt: null,
    lastDisconnectedAt: null
  });

  const reconnectAttempts = useRef(0);
  const currentRoomId = useRef<string | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPings = useRef<Map<string, number>>(new Map());
  const lastGameState = useRef<any>(null); // 保存最后的游戏状态用于重连

  // 清理 ping 计时器
  const clearPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  // 发送 ping 消息
  const sendPing = useCallback((ws: WebSocket) => {
    if (ws.readyState === WebSocket.OPEN) {
      const pingId = `ping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      pendingPings.current.set(pingId, Date.now());
      
      ws.send(JSON.stringify({
        type: 'ping',
        pingId
      }));
      
      // 5秒后清理未响应的 ping
      setTimeout(() => {
        if (pendingPings.current.has(pingId)) {
          pendingPings.current.delete(pingId);
          // 如果 5 秒没有响应，认为连接可能有问题
          if (pendingPings.current.size === 0) {
            setPing(null);
          }
        }
      }, 5000);
    }
  }, []);

  // 启动 ping 计时器
  const startPingInterval = useCallback((ws: WebSocket) => {
    clearPingInterval();
    // 立即发送一次 ping
    sendPing(ws);
    // 定期发送 ping
    pingIntervalRef.current = setInterval(() => {
      sendPing(ws);
    }, PING_INTERVAL);
  }, [clearPingInterval, sendPing]);

  // 处理 pong 响应
  const handlePong = useCallback((pingId: string) => {
    const sentTime = pendingPings.current.get(pingId);
    if (sentTime) {
      const latency = Date.now() - sentTime;
      setPing(latency);
      setConnectionStatus(prev => ({ ...prev, ping: latency }));
      pendingPings.current.delete(pingId);
    }
  }, []);

  const connect = useCallback((roomId: string) => {
    if (!user || user.isGuest) {
      console.error('User must be authenticated to connect to battle websocket');
      return;
    }

    currentRoomId.current = roomId;
    
    // 更新状态为重连中（如果是重连）
    if (reconnectAttempts.current > 0) {
      setConnectionStatus(prev => ({
        ...prev,
        reconnecting: true,
        reconnectAttempt: reconnectAttempts.current
      }));
    }

    const wsUrl = `wss://wcwnyvoezudyxiayyzek.supabase.co/functions/v1/battle-websocket?roomId=${roomId}&userId=${user.id}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Battle WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        setConnectionStatus({
          isConnected: true,
          ping: null,
          reconnecting: false,
          reconnectAttempt: 0,
          lastConnectedAt: Date.now(),
          lastDisconnectedAt: null
        });
        
        // 启动 ping 测量
        startPingInterval(ws);
        
        // 如果是重连，请求状态同步
        if (lastGameState.current) {
          ws.send(JSON.stringify({
            type: 'request_sync',
            lastState: lastGameState.current
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // 处理 pong 响应
          if (message.type === 'pong' && message.pingId) {
            handlePong(message.pingId);
            return;
          }
          
          // 处理状态同步响应
          if (message.type === 'sync_state') {
            console.log('Received state sync:', message);
            // 状态同步由使用方处理
          }
          
          setLastMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('Battle WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        clearPingInterval();
        setPing(null);
        
        setConnectionStatus(prev => ({
          ...prev,
          isConnected: false,
          ping: null,
          lastDisconnectedAt: Date.now()
        }));
        
        // 自动重连逻辑
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS && currentRoomId.current) {
          const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts.current);
          
          setConnectionStatus(prev => ({
            ...prev,
            reconnecting: true,
            reconnectAttempt: reconnectAttempts.current + 1
          }));
          
          console.log(`Attempting reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
          
          setTimeout(() => {
            reconnectAttempts.current++;
            if (currentRoomId.current) {
              connect(currentRoomId.current);
            }
          }, delay);
        } else {
          setConnectionStatus(prev => ({
            ...prev,
            reconnecting: false
          }));
        }
      };

      ws.onerror = (error) => {
        console.error('Battle WebSocket error:', error);
      };

      setSocket(ws);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [user, startPingInterval, clearPingInterval, handlePong]);

  const disconnect = useCallback(() => {
    currentRoomId.current = null;
    reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS; // 阻止自动重连
    clearPingInterval();
    
    if (socket) {
      socket.close();
      setSocket(null);
      setIsConnected(false);
      setPing(null);
      setConnectionStatus({
        isConnected: false,
        ping: null,
        reconnecting: false,
        reconnectAttempt: 0,
        lastConnectedAt: null,
        lastDisconnectedAt: Date.now()
      });
    }
  }, [socket, clearPingInterval]);

  const sendMessage = useCallback((message: BattleWebSocketMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      // 保存游戏状态用于可能的重连同步
      if (message.type === 'team_state_update' || message.type === 'game_state') {
        lastGameState.current = message.data;
      }
      
      socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, [socket]);

  // 请求状态同步
  const requestStateSync = useCallback(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'request_sync'
      }));
    }
  }, [socket]);

  useEffect(() => {
    return () => {
      clearPingInterval();
      disconnect();
    };
  }, [disconnect, clearPingInterval]);

  return {
    socket,
    isConnected,
    ping,
    connectionStatus,
    sendMessage,
    lastMessage,
    connect,
    disconnect,
    requestStateSync
  };
};
