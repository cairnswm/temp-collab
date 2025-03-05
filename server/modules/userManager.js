const connectedUsers = new Map();
const userConnections = new Map();

const userManager = {
  // Track connected users and their websocket connections
  connectedUsers,
  userConnections,

  // Add a user to the tracking maps
  addUser: (userId, clientId, userName, roomName, ws) => {
    connectedUsers.set(userId, {
      clientId,
      userid: userId,
      name: userName,
      room: roomName
    });
    
    userConnections.set(userId, ws);
    
    // Store userId on the websocket for cleanup
    ws.userId = userId;
    
    console.log(`User added: ${userId} (${userName}) in room ${roomName}`);
  },

  // Remove a user from tracking
  removeUser: (userId) => {
    if (userId) {
      console.log(`Cleaning up user ${userId}`);
      connectedUsers.delete(userId);
      userConnections.delete(userId);
      return true;
    }
    return false;
  },

  // Find user by client ID
  findUserByClientId: (clientId) => {
    for (const [userId, user] of connectedUsers.entries()) {
      if (user.clientId === clientId) {
        return { userId, user };
      }
    }
    return null;
  },

  // Get user information
  getUser: (userId) => {
    return connectedUsers.get(userId);
  },

  // Get user's websocket connection
  getUserConnection: (userId) => {
    return userConnections.get(userId);
  },

  // Get all connected users
  getAllUsers: () => {
    return Array.from(connectedUsers.entries()).map(([id, user]) => ({
      id,
      ...user
    }));
  }
};

module.exports = userManager;
