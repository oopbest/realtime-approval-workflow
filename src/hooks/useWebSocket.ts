'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { WSMessage, WSNotificationPayload, ApprovalRequest } from '@/lib/types';

interface UseWebSocketOptions {
  userId: string;
  userName: string;
  role: string;
  onNotification?: (notification: WSNotificationPayload) => void;
}

export function useWebSocket({
  userId,
  userName,
  role,
  onNotification,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onNotificationRef = useRef(onNotification);

  // Keep the callback ref up to date
  onNotificationRef.current = onNotification;

  const intentionalCloseRef = useRef(false);

  const connect = useCallback(() => {
    // Build WebSocket URL from current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log('🔌 Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      intentionalCloseRef.current = false;

      // Register with server
      ws.send(
        JSON.stringify({
          type: 'connection',
          payload: { userId, userName, role },
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        console.log('📨 Received:', message.type);

        switch (message.type) {
          case 'requests-list': {
            setRequests(message.payload as ApprovalRequest[]);
            break;
          }

          case 'request-created': {
            const newRequest = message.payload as ApprovalRequest;
            // Prevent duplicate requests by checking if it already exists
            setRequests((prev) => {
              if (prev.some((r) => r.id === newRequest.id)) return prev;
              return [newRequest, ...prev];
            });
            break;
          }

          case 'request-updated': {
            const updated = message.payload as ApprovalRequest;
            setRequests((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            );
            break;
          }

          case 'notification': {
            const notification = message.payload as WSNotificationPayload;
            if (onNotificationRef.current) {
              onNotificationRef.current(notification);
            }
            break;
          }
        }
      } catch (err) {
        console.error('Error parsing message:', err);
      }
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);

      // Auto reconnect after 3 seconds ONLY if not intentionally closed (unmounted)
      if (!intentionalCloseRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Reconnecting...');
          connect();
        }, 3000);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      // Let onclose handle the reconnect
    };

    wsRef.current = ws;
  }, [userId, userName, role]);

  useEffect(() => {
    if (userId && userName && role) {
      connect();
    }

    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, userId, userName, role]);

  // Send a message through WebSocket
  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  return {
    isConnected,
    requests,
    sendMessage,
  };
}
