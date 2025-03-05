const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

// Import modules
const userManager = require('./modules/userManager');
const roomManager = require('./modules/roomManager');
const documentManager = require('./modules/documentManager');
const websocketHandler = require('./modules/websocketHandler');

// Initialize Express app
const app = express();
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  // Set a ping timeout to detect dead connections
  clientTracking: true,
  pingInterval: 30000,
  pingTimeout: 60000
});

// Initialize the WebSocket handler
websocketHandler.initialize(wss);

// Basic route
app.get('/', (req, res) => {
  res.send('Collaborative Editor Server is running');
});

// Start the server
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
