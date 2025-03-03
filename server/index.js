const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const Y = require('yjs');
const { setupWSConnection } = require('y-websocket/bin/utils');

// Store documents by name
const documents = new Map();

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.get('/', (req, res) => {
  res.send('Collaborative Editor Server is running');
});

wss.on('connection', (ws, req) => {
  const docName = req.url.slice(1).split('?')[0] || 'collaborative-editor';
  console.log(`New connection for document: ${docName}`);
  
  // Get or create document
  if (!documents.has(docName)) {
    console.log(`Creating new document: ${docName}`);
    const doc = new Y.Doc();
    const text = doc.getText('editor');
    
    text.observe(event => {
      console.log('Document update received:');
      console.log('- Delta:', event.delta);
      console.log('- Current content length:', text.length);
      console.log('- Current content:', text.toString().substring(0, 100) + (text.length > 100 ? '...' : ''));
    });
    
    documents.set(docName, doc);
  } else {
    console.log(`Using existing document: ${docName}`);
  }
  
  setupWSConnection(ws, req, {
    docName: docName,
    gc: true,
    documents: documents
  });
});

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
