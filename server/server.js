require('dotenv').config();
const http = require('http');
const WebSocket = require('ws');
const Y = require('yjs');
const { Buffer } = require('buffer');

const utils = require('y-websocket/bin/utils.js');

// In-memory storage for documents
const documentsStore = new Map();

const production = process.env.PRODUCTION != null;
const port = process.env.PORT || 8080;


const server = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('okay');
});


// const wss = new WebSocket.Server({ server });
const wss = new WebSocket.Server({  noServer: true })

wss.on('connection', utils.setupWSConnection);
server.on('upgrade', (request, socket, head) => {
  // You may check auth of request here..
  /**
   * @param {any} ws
   */
  const handleAuth = ws => {
    wss.emit('connection', ws, request)
  }
  wss.handleUpgrade(request, socket, head, handleAuth)
});


utils.setPersistence({
  bindState: async (docName, ydoc) => {
    // If we have a stored document, apply its state to the ydoc
    if (documentsStore.has(docName)) {
      const persistedState = documentsStore.get(docName);
      Y.applyUpdate(ydoc, persistedState);
    } else {
      // Store the initial state
      documentsStore.set(docName, Y.encodeStateAsUpdate(ydoc));
    }
    
    // Listen for updates and store them
    ydoc.on('update', update => {
      documentsStore.set(docName, update);
    });
  },
  writeState: async (docName, ydoc) => {
    // Nothing to do here since updates are stored in the 'update' event handler
    return Promise.resolve();
  }
})

server.listen(port);

console.log(`Listening to http://localhost:${port} ${production ? '(production)' : ''}`)
