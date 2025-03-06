const { setupWSConnection } = require('y-websocket/bin/utils');
const userManager = require('./userManager');
const roomManager = require('./roomManager');
const documentManager = require('./documentManager');

// Heartbeat interval in milliseconds
const HEARTBEAT_INTERVAL = 30000;
const CONNECTION_TIMEOUT = 60000;

const websocketHandler = {
  // Initialize heartbeat interval
  heartbeatInterval: null,
  
  // Initialize the WebSocket server
  initialize: (wss) => {
    // Start the heartbeat interval
    websocketHandler.heartbeatInterval = setInterval(() => {
      websocketHandler.heartbeat(wss);
    }, HEARTBEAT_INTERVAL);
    
    // Clean up on server close
    wss.on('close', () => {
      clearInterval(websocketHandler.heartbeatInterval);
    });
    
    // Set up connection handler
    wss.on('connection', (ws, req) => {
      websocketHandler.handleConnection(ws, req);
    });
    
    return wss;
  },
  
  // Function to check for dead connections and clean them up
  heartbeat: (wss) => {
    wss.clients.forEach(ws => {
      if (ws.isAlive === false) {
        // Connection is dead, clean up
        if (ws.userId) {
          console.log(`Cleaning up dead connection for user ${ws.userId}`);
          userManager.removeUser(ws.userId);
        }
        return ws.terminate();
      }
      
      // Mark the connection as dead until we get a pong response
      ws.isAlive = false;
      ws.ping(() => {});
    });
  },
  
  // Handle a new WebSocket connection
  handleConnection: (ws, req) => {
    // Mark the connection as alive
    ws.isAlive = true;
    
    // Handle pong messages to keep the connection alive
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    const roomName = req.url.slice(1).split('?')[0] || 'collaborative-editor';
    console.log(`New connection for room: ${roomName}`);
    
    // Add this connection to the room
    roomManager.addConnectionToRoom(roomName, ws);
    
    // Parse URL to get document type parameter
    const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
    const requestedDocType = urlParams.get('docType');
    
    // Determine document type based on parameter or fallback to room name for backward compatibility
    let docType;
    if (requestedDocType === 'todo') {
      docType = documentManager.DOC_TYPES.TODO;
      documentManager.setRequestedDocumentType(roomName, documentManager.DOC_TYPES.TODO);
    } else if (requestedDocType === 'canvas') {
      docType = documentManager.DOC_TYPES.CANVAS;
      documentManager.setRequestedDocumentType(roomName, documentManager.DOC_TYPES.CANVAS);
    } else if (requestedDocType === 'text') {
      docType = documentManager.DOC_TYPES.TEXT;
      documentManager.setRequestedDocumentType(roomName, documentManager.DOC_TYPES.TEXT);
    } else if (roomName === 'todo') {
      // Fallback to room name for backward compatibility
      docType = documentManager.DOC_TYPES.TODO;
    } else if (roomName === 'canvas') {
      docType = documentManager.DOC_TYPES.CANVAS;
    } else {
      docType = documentManager.DOC_TYPES.TEXT;
    }
    
    // Get or create document for this room with the appropriate type
    documentManager.getOrCreateDocument(roomName, (doc) => {
      // Now that the document is ready, set up the connection
      
      // Get the actual document type (might be different if room already existed)
      const actualDocType = documentManager.getDocumentType(roomName);
      console.log(`Document type for room ${roomName}: ${actualDocType}`);
      
      websocketHandler.setupRoomConnection(ws, req, roomName);
    }, docType);
    
    // Handle disconnection
    ws.on('close', () => {
      console.log(`Client disconnected from room: ${roomName}`);
      
      try {
        // Remove this connection from the room
        if (ws.roomName) {
          roomManager.removeConnectionFromRoom(ws.roomName, ws);
          
          // Check if room is now empty
          roomManager.checkAndCleanupRoom(ws.roomName);
        }
        
        // Clean up user if we have their ID
        if (ws.userId) {
          console.log(`Cleaning up user ${ws.userId}`);
          userManager.removeUser(ws.userId);
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
  },
  
  // Function to set up a connection for a specific room
  setupRoomConnection: (ws, req, roomName) => {
    // Get the documents map for this specific connection
    const connectionDocuments = documentManager.getConnectionDocuments(roomName);
    
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
                    userManager.addUser(userId, clientId, userName, roomName, ws);
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
                const userInfo = userManager.findUserByClientId(clientId);
                if (userInfo) {
                  console.log(`User disconnected from room ${roomName}: ${userInfo.userId} (${userInfo.user.name})`);
                  userManager.removeUser(userInfo.userId);
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
};

module.exports = websocketHandler;
