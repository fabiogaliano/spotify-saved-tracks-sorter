# WebSocket Implementation Action Plan for Track Analysis Status Updates

## Overview
This PR implements WebSockets for real-time track analysis status updates, replacing the current polling mechanism to provide more accurate and responsive job status information.

## Action Items

### 1. WebSocket Server Implementation
- [ ] Create `scripts/websocketServer.ts` file
  ```typescript
  // Implementation of WebSocket server using Bun's built-in WebSocket support
  // with endpoints for status notifications and client connections
  ```
- [ ] Add broadcast functionality for job status updates
- [ ] Add notification endpoint to receive updates from the analysis worker

### 2. WebSocket Client Hook
- [ ] Create `app/lib/hooks/useWebSocket.ts` hook
  ```typescript
  // Custom hook for WebSocket connection management with reconnection logic
  ```
- [ ] Implement connection status tracking
- [ ] Add message handling and parsing
- [ ] Implement send message functionality

### 3. Analysis Worker Modifications
- [ ] Update `scripts/analysisWorker.ts` to send status notifications
  ```typescript
  // Add notification function to send updates to WebSocket server
  ```
- [ ] Add status update calls at key points in the analysis process:
  - [ ] When analysis starts
  - [ ] When analysis completes successfully
  - [ ] When analysis fails
  - [ ] When batch progress updates occur

### 4. Context Provider Updates
- [ ] Modify `LikedSongsContext.tsx` to use WebSockets instead of polling
  ```typescript
  // Replace polling mechanism with WebSocket subscription
  ```
- [ ] Remove `useInterval` for job status polling
- [ ] Add WebSocket message handling for job status updates
- [ ] Update track status based on WebSocket messages
- [ ] Maintain backward compatibility during transition

### 5. Package Configuration
- [ ] Add WebSocket server script to `package.json`
  ```json
  "websocket": "bun run scripts/websocketServer.ts"
  ```
- [ ] Update documentation for running the services together

### 6. Testing
- [ ] Test WebSocket server in isolation
- [ ] Test worker notifications
- [ ] Test end-to-end flow with multiple tracks
- [ ] Verify UI updates correctly with real-time status changes

### 7. Cleanup
- [ ] Remove old polling code once WebSocket implementation is verified
- [ ] Remove or deprecate unused API endpoints
- [ ] Update comments and documentation

## Detailed Implementation Steps

### Step 1: Create WebSocket Server
```typescript
// scripts/websocketServer.ts
import { Server } from "bun";

const ws = new Server({
  port: 3001,
  fetch(req, server) {
    // Handle HTTP requests
    if (req.method === "POST" && req.url === "/notify") {
      try {
        const body = await req.json();
        // Broadcast the status update to all connected clients
        ws.publish("job_status", JSON.stringify({
          type: "job_status",
          data: body
        }));
        return new Response("Status update broadcast", { status: 200 });
      } catch (error) {
        return new Response(`Error processing notification: ${error}`, { status: 500 });
      }
    }
    
    if (req.url === "/") {
      return new Response("WebSocket server is running");
    }
    
    // Upgrade HTTP requests to WebSocket connections
    if (server.upgrade(req)) {
      return; // Return nothing if upgrade was successful
    }
    
    return new Response("Upgrade failed", { status: 400 });
  },
  websocket: {
    open(ws) {
      console.log("WebSocket connection opened");
    },
    message(ws, message) {
      // Handle incoming messages
      console.log(`Received message: ${message}`);
    },
    close(ws, code, message) {
      console.log(`WebSocket closed: ${code} ${message}`);
    },
  },
});

console.log(`WebSocket server listening on port ${ws.port}`);
```

### Step 2: Create WebSocket Hook
```typescript
// app/lib/hooks/useWebSocket.ts
import { useState, useEffect, useCallback } from 'react';

export function useWebSocket(url: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Connect to WebSocket
  useEffect(() => {
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setReconnectAttempt(0);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Attempt to reconnect with exponential backoff
      const timeout = Math.min(1000 * (2 ** reconnectAttempt), 30000);
      setTimeout(() => {
        setReconnectAttempt(prev => prev + 1);
      }, timeout);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    setSocket(ws);
    
    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, [url, reconnectAttempt]);
  
  // Send message function
  const sendMessage = useCallback((data: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(data));
    } else {
      console.warn('Cannot send message, WebSocket not connected');
    }
  }, [socket, isConnected]);
  
  return { isConnected, lastMessage, sendMessage };
}
```

### Step 3: Update Analysis Worker
```typescript
// Add to scripts/analysisWorker.ts
import { fetch } from "bun";

// Add this function to notify the WebSocket server about status changes
async function notifyStatusChange(jobId, trackId, status, progress) {
  try {
    await fetch("http://localhost:3001/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        trackId,
        status,
        progress,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    logger.error(`Failed to notify status change: ${error}`);
  }
}

// Call at appropriate points in the worker
```

### Step 4: Update Context Provider
```typescript
// Modify app/features/liked-songs-management/context/LikedSongsContext.tsx
import { useWebSocket } from '~/lib/hooks/useWebSocket';

// Inside LikedSongsProvider component:
const { lastMessage, isConnected } = useWebSocket('ws://localhost:3001');

// Replace polling with WebSocket updates
useEffect(() => {
  if (lastMessage && lastMessage.type === 'job_status') {
    const jobStatus = lastMessage.data;
    
    // Update job status based on WebSocket message
    if (currentJob && jobStatus.jobId === currentJob.id) {
      updateJobStatus({
        status: jobStatus.status,
        tracksProcessed: jobStatus.progress.tracksProcessed,
        tracksSucceeded: jobStatus.progress.tracksSucceeded,
        tracksFailed: jobStatus.progress.tracksFailed
      });
      
      // Update individual track statuses if needed
      if (jobStatus.trackId) {
        updateSongAnalysisDetails(
          parseInt(jobStatus.trackId, 10),
          null,
          jobStatus.status === 'analyzed' ? 'analyzed' : 
          jobStatus.status === 'failed' ? 'failed' : 'pending'
        );
      }
    }
  }
}, [lastMessage, currentJob, updateJobStatus, updateSongAnalysisDetails]);

// Remove useInterval for polling
// useInterval(pollJobStatus, isPollingActive ? 3000 : null);
```

### Step 5: Update Package.json
```json
"scripts": {
  // ... existing scripts
  "websocket": "bun run scripts/websocketServer.ts"
}
```

## Benefits
- Real-time updates without polling overhead
- More accurate job status tracking
- Better user experience with immediate feedback
- Reduced server load from frequent API calls
- Improved reliability in status reporting
