const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const Y = require('yjs');
const { setupWSConnection } = require('y-websocket/bin/utils');

// Store rooms and their documents
const rooms = new Map();

// Track room activity and users
const roomUsers = new Map();

// Track connected users and their websocket connections
const connectedUsers = new Map();
const userConnections = new Map();

// Heartbeat interval in milliseconds
const HEARTBEAT_INTERVAL = 30000;
const CONNECTION_TIMEOUT = 60000;

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ 
  server,
  // Set a ping timeout to detect dead connections
  clientTracking: true,
  pingInterval: HEARTBEAT_INTERVAL,
  pingTimeout: CONNECTION_TIMEOUT
});

app.get('/', (req, res) => {
  res.send('Collaborative Editor Server is running');
});

// Function to check for dead connections and clean them up
function heartbeat() {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) {
      // Connection is dead, clean up
      if (ws.userId) {
        console.log(`Cleaning up dead connection for user ${ws.userId}`);
        connectedUsers.delete(ws.userId);
        userConnections.delete(ws.userId);
      }
      return ws.terminate();
    }
    
    // Mark the connection as dead until we get a pong response
    ws.isAlive = false;
    ws.ping(() => {});
  });
}

// Function to check if a room is empty and clean it up if needed
const checkAndCleanupRoom = (roomName) => {
  if (roomUsers.has(roomName)) {
    const users = roomUsers.get(roomName);
    if (users.size === 0) {
      console.log(`Room ${roomName} is empty, cleaning up`);
      rooms.delete(roomName);
      roomUsers.delete(roomName);
      return true;
    }
  }
  return false;
};

// Start the heartbeat interval
const heartbeatInterval = setInterval(heartbeat, HEARTBEAT_INTERVAL);

// Clean up on server close
wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

wss.on('connection', (ws, req) => {
  // Mark the connection as alive
  ws.isAlive = true;
  
  // Handle pong messages to keep the connection alive
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  const roomName = req.url.slice(1).split('?')[0] || 'collaborative-editor';
  console.log(`New connection for room: ${roomName}`);
  
  // Store the room name on the websocket for cleanup
  ws.roomName = roomName;
  
  // Initialize room users tracking if needed
  if (!roomUsers.has(roomName)) {
    roomUsers.set(roomName, new Set());
  }
  
  // Add this connection to the room
  const roomUserSet = roomUsers.get(roomName);
  roomUserSet.add(ws);
  
  // Get or create document for this room
  if (!rooms.has(roomName)) {
    console.log(`Creating new room: ${roomName}`);
    
    // Simulate database fetch delay (0.5 seconds)
    setTimeout(() => {
      const doc = new Y.Doc();
      const text = doc.getText('editor');
      
      text.observe(event => {
        console.log(`Document update received in room ${roomName}:`);
        console.log('- Delta:', event.delta);
        console.log('- Current content length:', text.length);
        console.log('- Current content:', text.toString().substring(0, 100) + (text.length > 100 ? '...' : ''));
      });
      
      rooms.set(roomName, doc);
      
      // Now that the document is ready, set up the connection
      setupRoomConnection(ws, req, roomName);
      
    }, 500); // 0.5 second delay
  } else {
    console.log(`Using existing room: ${roomName}`);
    // Document already exists, set up connection immediately
    setupRoomConnection(ws, req, roomName);
  }
  
  // Handle disconnection
  ws.on('close', () => {
    console.log(`Client disconnected from room: ${roomName}`);
    
    try {
      // Remove this connection from the room
      if (ws.roomName && roomUsers.has(ws.roomName)) {
        const users = roomUsers.get(ws.roomName);
        users.delete(ws);
        
        // Check if room is now empty
        checkAndCleanupRoom(ws.roomName);
      }
      
      // Clean up user if we have their ID
      if (ws.userId) {
        console.log(`Cleaning up user ${ws.userId}`);
        connectedUsers.delete(ws.userId);
        userConnections.delete(ws.userId);
      }
      
      // Clean up awareness
      if (ws.awareness) {
        // Remove the event listener
        if (ws.awarenessChangeHandler) {
          ws.awareness.off('change', ws.awarenessChangeHandler);
        }
        
        // Force awareness update to all clients
        const clientId = ws.awareness.clientID;
        if (clientId) {
          ws.awareness.removeStates([clientId], 'disconnect');
        }
      }
    } catch (e) {
      console.error('Error during connection cleanup:', e);
    }
  });
});

// Function to set up a connection for a specific room
function setupRoomConnection(ws, req, roomName) {
  // Create a documents map for this specific connection
  // This is needed because y-websocket expects a documents map
  const connectionDocuments = new Map();
  connectionDocuments.set(roomName, rooms.get(roomName));
  
  // Setup connection with custom awareness handling
  setupWSConnection(ws, req, {
    docName: roomName,
    gc: true,
    documents: connectionDocuments
  });
  
  // Add custom awareness change handler
  // Wait a bit to ensure awareness is properly set up
  setTimeout(() => {
    if (ws.awareness) {
      const awarenessChangeHandler = ({ added, updated, removed }) => {
        try {
          // Log the change
          console.log(`Awareness change in room ${roomName}:`, { added, updated, removed });
          
          // Get the updated awareness states
          const states = ws.awareness.getStates();
          
          // Handle added or updated users
          [...added, ...updated].forEach(clientId => {
            try {
              const state = states.get(clientId);
              if (state && state.user) {
                const userId = state.user.userid;
                const userName = state.user.name;
                
                if (userId) {
                  console.log(`User updated in room ${roomName}: ${userId} (${userName})`);
                  
                  // Store the user
                  connectedUsers.set(userId, {
                    clientId,
                    userid: userId,
                    name: userName,
                    room: roomName
                  });
                  
                  // Store the connection
                  userConnections.set(userId, ws);
                  
                  // Store userId on the websocket for cleanup
                  ws.userId = userId;
                }
              }
            } catch (e) {
              console.error('Error processing user update:', e);
            }
          });
          
          // Handle removed users
          removed.forEach(clientId => {
            try {
              // Find the user with this clientId and remove them
              for (const [userId, user] of connectedUsers.entries()) {
                if (user.clientId === clientId) {
                  console.log(`User disconnected from room ${roomName}: ${userId} (${user.name})`);
                  connectedUsers.delete(userId);
                  userConnections.delete(userId);
                  break;
                }
              }
            } catch (e) {
              console.error('Error processing user removal:', e);
            }
          });
        } catch (e) {
          console.error('Error in awareness change handler:', e);
        }
      };
      
      // Register the awareness change handler
      ws.awareness.on('change', awarenessChangeHandler);
      
      // Store the handler for cleanup
      ws.awarenessChangeHandler = awarenessChangeHandler;
      
      console.log(`Awareness handler registered successfully for room ${roomName}`);
    } else {
      console.warn('No awareness instance found on websocket');
    }
  }, 100); // Small delay to ensure awareness is set up
}

const PORT = process.env.PORT || 1234;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Handle server shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
