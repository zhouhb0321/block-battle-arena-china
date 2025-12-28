
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
}

export interface BattleWebSocketHook {
  socket: WebSocket | null;
  isConnected: boolean;
  sendMessage: (message: BattleWebSocketMessage) => void;
  lastMessage: BattleWebSocketMessage | null;
  connect: (roomId: string) => void;
  disconnect: () => void;
}

export const useBattleWebSocket = (): BattleWebSocketHook => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<BattleWebSocketMessage | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback((roomId: string) => {
    if (!user || user.isGuest) {
      console.error('User must be authenticated to connect to battle websocket');
      return;
    }

    const wsUrl = `wss://wcwnyvoezudyxiayyzek.supabase.co/functions/v1/battle-websocket?roomId=${roomId}&userId=${user.id}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Battle WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('Battle WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // 尝试重连
        if (reconnectAttempts.current < maxReconnectAttempts) {
          setTimeout(() => {
            reconnectAttempts.current++;
            connect(roomId);
          }, 1000 * Math.pow(2, reconnectAttempts.current));
        }
      };

      ws.onerror = (error) => {
        console.error('Battle WebSocket error:', error);
      };

      setSocket(ws);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [user]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  const sendMessage = useCallback((message: BattleWebSocketMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, [socket]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    socket,
    isConnected,
    sendMessage,
    lastMessage,
    connect,
    disconnect
  };
};
