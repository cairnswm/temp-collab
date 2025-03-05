const Y = require('yjs');

// Store rooms and their documents
const rooms = new Map();
// Store document types for each room
const documentTypes = new Map();

// Document type constants
const DOC_TYPES = {
  TEXT: 'text',
  TODO: 'todo'
};

const documentManager = {
  // Store for room documents
  rooms,
  
  // Document type constants
  DOC_TYPES,
  
  // Get document type for a room
  getDocumentType: (roomName) => {
    return documentTypes.get(roomName) || DOC_TYPES.TEXT; // Default to text for backward compatibility
  },
  
  // Get or create a document for a room
  getOrCreateDocument: (roomName, callback, docType = DOC_TYPES.TEXT) => {
    if (!rooms.has(roomName)) {
      console.log(`Creating new document for room: ${roomName} with type: ${docType}`);
      
      // Simulate database fetch delay (0.5 seconds)
      setTimeout(() => {
        const doc = new Y.Doc();
        
        // Store the document type
        documentTypes.set(roomName, docType);
        
        if (docType === DOC_TYPES.TEXT) {
          // Create text document (existing behavior)
          const text = doc.getText('editor');
          
          text.observe(event => {
            console.log(`Document update received in room ${roomName}:`);
            console.log('- Delta:', event.delta);
            console.log('- Current content length:', text.length);
            console.log('- Current content:', text.toString().substring(0, 100) + (text.length > 100 ? '...' : ''));
          });
        } else if (docType === DOC_TYPES.TODO) {
          // Create todo list document
          const todoList = doc.getArray('todoList');
          
          todoList.observe(event => {
            console.log(`Todo list update received in room ${roomName}:`);
            console.log('- Delta:', event.delta);
            console.log('- Current items count:', todoList.length);
          });
        }
        
        rooms.set(roomName, doc);
        
        // Call the callback with the document
        if (callback) callback(doc);
        
      }, 500); // 0.5 second delay
      
      return null;
    } else {
      console.log(`Using existing document for room: ${roomName}`);
      const doc = rooms.get(roomName);
      
      // Call the callback immediately with the existing document
      if (callback) callback(doc);
      
      return doc;
    }
  },

  // Get a document for a room if it exists
  getDocument: (roomName) => {
    return rooms.get(roomName) || null;
  },
  
  // Get the text shared type from a document (for backward compatibility)
  getDocumentText: (roomName) => {
    const doc = rooms.get(roomName);
    return doc ? doc.getText('editor') : null;
  },
  
  // Get the todo list shared type from a document
  getDocumentTodoList: (roomName) => {
    const doc = rooms.get(roomName);
    return doc ? doc.getArray('todoList') : null;
  },

  // Delete a document for a room
  deleteDocument: (roomName) => {
    if (rooms.has(roomName)) {
      console.log(`Deleting document for room: ${roomName}`);
      rooms.delete(roomName);
      documentTypes.delete(roomName);
      return true;
    }
    return false;
  },

  // Get a map of documents for a specific connection
  // This is needed because y-websocket expects a documents map
  getConnectionDocuments: (roomName) => {
    const connectionDocuments = new Map();
    const doc = rooms.get(roomName);
    
    if (doc) {
      connectionDocuments.set(roomName, doc);
    }
    
    return connectionDocuments;
  },

  // Get all room names with documents
  getAllDocumentRooms: () => {
    return Array.from(rooms.keys());
  }
};

module.exports = documentManager;
