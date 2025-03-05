// Store rooms and their users
const roomUsers = new Map();

const roomManager = {
  // Track room activity and users
  roomUsers,

  // Initialize a room if it doesn't exist
  initializeRoom: (roomName) => {
    if (!roomUsers.has(roomName)) {
      roomUsers.set(roomName, new Set());
      console.log(`Room initialized: ${roomName}`);
    }
    return roomUsers.get(roomName);
  },

  // Add a connection to a room
  addConnectionToRoom: (roomName, ws) => {
    const roomUserSet = roomManager.initializeRoom(roomName);
    roomUserSet.add(ws);
    
    // Store the room name on the websocket for cleanup
    ws.roomName = roomName;
    
    console.log(`Connection added to room: ${roomName}`);
    return roomUserSet;
  },

  // Remove a connection from a room
  removeConnectionFromRoom: (roomName, ws) => {
    if (roomUsers.has(roomName)) {
      const users = roomUsers.get(roomName);
      const removed = users.delete(ws);
      console.log(`Connection removed from room: ${roomName}`);
      return removed;
    }
    return false;
  },

  // Check if a room is empty and clean it up if needed
  checkAndCleanupRoom: (roomName) => {
    if (roomUsers.has(roomName)) {
      const users = roomUsers.get(roomName);
      if (users.size === 0) {
        console.log(`Room ${roomName} is empty, cleaning up`);
        roomUsers.delete(roomName);
        return true;
      }
    }
    return false;
  },

  // Get all connections in a room
  getRoomConnections: (roomName) => {
    if (roomUsers.has(roomName)) {
      return Array.from(roomUsers.get(roomName));
    }
    return [];
  },

  // Get all rooms
  getAllRooms: () => {
    return Array.from(roomUsers.keys());
  },

  // Get room size (number of connections)
  getRoomSize: (roomName) => {
    if (roomUsers.has(roomName)) {
      return roomUsers.get(roomName).size;
    }
    return 0;
  }
};

module.exports = roomManager;
