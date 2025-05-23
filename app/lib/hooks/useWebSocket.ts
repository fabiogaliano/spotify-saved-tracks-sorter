import { useState, useEffect, useCallback, useRef } from 'react';

type WebSocketMessage = {
  type: string;
  data: any;
};

type WebSocketHookOptions = {
  autoConnect: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  debug?: boolean;
};

export function useWebSocket(url: string, options: WebSocketHookOptions = { autoConnect: false }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const connectingRef = useRef(false);
  const manualDisconnectRef = useRef(false);
  
  const MAX_RECONNECT_ATTEMPTS = options.reconnectAttempts || 3;
  const RECONNECT_DELAY = options.reconnectDelay || 3000;
  const DEBUG = options.debug || false;
  
  const log = useCallback((message: string) => {
    if (DEBUG) {
      console.log(`[WebSocket] ${message}`);
    }
  }, [DEBUG]);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (connectingRef.current) {
      log('Connection attempt already in progress');
      return;
    }
    
    // Don't reconnect if manually disconnected
    if (manualDisconnectRef.current) {
      log('Not connecting - manually disconnected');
      return;
    }
    
    // Don't attempt to reconnect if we're already connected
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      log('Already connected');
      return;
    }
    
    // Clean up any existing connection
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current !== null) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        log('WebSocket not available (not in browser)');
        return;
      }
      
      connectingRef.current = true;
      log(`Connecting to ${url}`);
      
      const ws = new WebSocket(url);
      
      // Set a connection timeout
      const connectionTimeoutId = window.setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          log('Connection timeout - closing socket');
          ws.close();
          // onclose will handle reconnection
        }
      }, 10000); // 10 second connection timeout
      
      ws.onopen = () => {
        clearTimeout(connectionTimeoutId);
        log('Connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        connectingRef.current = false;
        
        // Send a ping every 30 seconds to keep the connection alive
        const pingInterval = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
              log('Ping sent');
            } catch (e) {
              log('Failed to send ping');
              clearInterval(pingInterval);
            }
          } else {
            clearInterval(pingInterval);
          }
        }, 30000);
        
        // Clear interval on close
        ws.addEventListener('close', () => clearInterval(pingInterval));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle pong response
          if (data.type === 'pong') {
            log('Pong received');
            return;
          }
          
          setLastMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onclose = (event) => {
        clearTimeout(connectionTimeoutId);
        connectingRef.current = false;
        setIsConnected(false);
        
        // Don't attempt to reconnect if manually disconnected
        if (manualDisconnectRef.current) {
          log('Closed after manual disconnect');
          return;
        }
        
        // Don't log normal closures (code 1000)
        if (event.code !== 1000) {
          log(`Disconnected: ${event.code} ${event.reason}`);
        }
        
        // Don't reconnect on normal closure or unmount
        if (event.code === 1000 || event.code === 1001) {
          return;
        }
        
        // Only attempt to reconnect if we haven't exceeded the maximum attempts
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          // Exponential backoff with jitter
          const baseDelay = RECONNECT_DELAY;
          const attempt = reconnectAttemptsRef.current + 1;
          const exponentialDelay = baseDelay * Math.pow(1.5, attempt);
          const jitter = Math.random() * 0.5 + 0.75; // Random value between 0.75 and 1.25
          const delay = Math.min(exponentialDelay * jitter, 30000); // Cap at 30 seconds
          
          log(`Will reconnect in ${Math.round(delay)}ms (attempt ${attempt})`);
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectAttemptsRef.current = attempt;
            connect();
          }, delay);
        } else {
          log('Maximum reconnection attempts reached');
        }
      };
      
      ws.onerror = (error) => {
        // Log the error but let onclose handle the reconnection
        log(`Connection error: ${error.type}`);
      };
      
      socketRef.current = ws;
    } catch (error) {
      connectingRef.current = false;
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [url, log, RECONNECT_DELAY, MAX_RECONNECT_ATTEMPTS]);
  
  // Initialize connection if autoConnect is true
  useEffect(() => {
    if (options.autoConnect) {
      manualDisconnectRef.current = false;
      connect();
    }
    
    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounting');
        socketRef.current = null;
      }
      
      if (reconnectTimeoutRef.current !== null) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect, options.autoConnect]);
  
  // Send message function
  const sendMessage = useCallback((data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
      return true;
    } else {
      log('Cannot send message - not connected');
      return false;
    }
  }, [log]);
  
  // Subscribe to track updates
  const subscribeToTrack = useCallback((trackId: number | string) => {
    return sendMessage({
      type: 'subscribe',
      trackId
    });
  }, [sendMessage]);
  
  // Manual reconnect function
  const reconnect = useCallback(() => {
    log('Manual reconnect requested');
    reconnectAttemptsRef.current = 0;
    manualDisconnectRef.current = false;
    connect();
  }, [connect, log]);
  
  // Disconnect function
  const disconnect = useCallback(() => {
    log('Manual disconnect requested');
    manualDisconnectRef.current = true;
    
    if (socketRef.current) {
      socketRef.current.close(1000, 'User initiated disconnect');
      socketRef.current = null;
    }
    
    if (reconnectTimeoutRef.current !== null) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, [log]);

  return { 
    isConnected, 
    lastMessage, 
    sendMessage,
    subscribeToTrack,
    reconnect,
    connect,
    disconnect
  };
}
