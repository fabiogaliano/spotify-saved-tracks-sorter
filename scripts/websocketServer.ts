// Simple WebSocket server for track analysis status updates

const server = Bun.serve({
  port: 3001,
  fetch(req, server) {
    const url = new URL(req.url);

    // Add CORS headers for browser compatibility
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // Handle HTTP requests for notifications
    if (req.method === "POST" && url.pathname === "/notify") {
      return req.json().then(body => {
        console.log("Received notification:", body);

        // Handle job completion messages differently from track updates
        if (body.type === 'job_completed') {
          // Send job completion messages directly (not wrapped)
          const message = JSON.stringify(body);
          server.publish("status_updates", message);
        } else {
          // Wrap other messages in job_status format
          const message = JSON.stringify({
            type: "job_status",
            data: body
          });

          server.publish("status_updates", message);

          // Also publish to track-specific channel if trackId is present
          if (body.trackId) {
            server.publish(`track_${body.trackId}`, message);
          }
        }

        return new Response("Status update broadcast", {
          status: 200,
          headers
        });
      }).catch(error => {
        console.error("Error processing notification:", error);
        return new Response(`Error processing notification: ${error}`, {
          status: 500,
          headers
        });
      });
    }

    // Health check endpoint
    if (url.pathname === "/") {
      return new Response("WebSocket server is running", { headers });
    }

    // Upgrade the WebSocket connection
    // This is the critical part for browser compatibility
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (upgraded) {
        // Bun automatically returns a 101 Switching Protocols response
        return undefined;
      }
    }

    // Attempt to upgrade any WebSocket connection as a fallback
    const success = server.upgrade(req);
    if (success) {
      return undefined;
    }

    return new Response("Not Found", { status: 404, headers });
  },
  websocket: {
    // Called when a WebSocket is opened
    open(ws) {
      // Store client IP or some identifier to avoid logging duplicates
      const clientId = ws.remoteAddress || 'unknown';
      console.log(`WebSocket connection opened from ${clientId}`);

      // Subscribe to the general status updates channel by default
      ws.subscribe("status_updates");

      // Send a welcome message to confirm connection
      ws.send(JSON.stringify({
        type: "connected",
        message: "Connected to WebSocket server"
      }));
    },

    // Called when a message is received
    message(ws, message) {
      // Don't log ping messages to avoid cluttering the console
      const isPingMessage = typeof message === 'string' && message.includes('"type":"ping"');
      if (!isPingMessage) {
        console.log(`Received message: ${message}`);
      }

      try {
        // Parse the message
        const data = typeof message === 'string' ? JSON.parse(message) : message;

        // Handle ping messages with pong response
        if (data.type === "ping") {
          ws.send(JSON.stringify({
            type: "pong",
            timestamp: Date.now()
          }));
          return;
        }

        // Handle subscription requests
        if (data.type === "subscribe" && data.trackId) {
          const channelName = `track_${data.trackId}`;
          console.log(`Client subscribed to track ${data.trackId}`);

          // Subscribe to the track-specific channel
          ws.subscribe(channelName);

          // Send acknowledgment
          ws.send(JSON.stringify({
            type: "subscribed",
            trackId: data.trackId
          }));
        }
      } catch (error) {
        console.error("Error processing message:", error);
        // Send error message back to client
        ws.send(JSON.stringify({
          type: "error",
          message: `Error processing message: ${error}`
        }));
      }
    },

    // Called when a WebSocket is closed
    close(ws, code, message) {
      console.log(`WebSocket closed: ${code} ${message}`);
    }
  }
});

console.log(`WebSocket server listening on ${server.hostname}:${server.port}`);
