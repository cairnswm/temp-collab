
import React, { createContext, useState, useEffect, useContext } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const EditorContext = createContext();

export const useEditor = () => useContext(EditorContext);

// Document type constants
export const DOC_TYPES = {
  TEXT: 'text',
  TODO: 'todo',
  CANVAS: 'canvas'
};

// Get document type from URL or determine based on room name for backward compatibility
const getDocumentType = (roomName) => {
  const urlParams = new URLSearchParams(window.location.search);
  const docTypeParam = urlParams.get('docType');
  
  if (docTypeParam === 'text') {
    return DOC_TYPES.TEXT;
  } else if (docTypeParam === 'todo') {
    return DOC_TYPES.TODO;
  } else if (docTypeParam === 'canvas') {
    return DOC_TYPES.CANVAS;
  } else if (roomName === 'todo') {
    // Fallback to room name for backward compatibility
    return DOC_TYPES.TODO;
  } else if (roomName === 'canvas') {
    return DOC_TYPES.CANVAS;
  } else {
    return DOC_TYPES.TEXT;
  }
};

// Get room from URL or use default
const getRoomFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('room') || 'collaborative-editor';
};

// Generate a unique user ID
const generateUserId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const EditorProvider = ({ children }) => {
  const [ydoc, setYdoc] = useState(null);
  const [provider, setProvider] = useState(null);
  const [ytext, setYtext] = useState(null);
  const [ytodoList, setYtodoList] = useState(null);
  const [ycanvasNotes, setYcanvasNotes] = useState(null);
  const [status, setStatus] = useState('disconnected');
  const [users, setUsers] = useState([]);
  const [room, setRoom] = useState(getRoomFromUrl());
  const [docType, setDocType] = useState(() => getDocumentType(getRoomFromUrl()));
  const [isLoading, setIsLoading] = useState(false);
  
  // Get or create user ID
  const [userId] = useState(() => {
    const savedId = localStorage.getItem('collaborativeEditorUserId');
    if (savedId) return savedId;
    
    const newId = generateUserId();
    localStorage.setItem('collaborativeEditorUserId', newId);
    return newId;
  });
  
  const [username, setUsername] = useState(() => {
    const savedName = localStorage.getItem('collaborativeEditorUsername');
    return savedName || `User ${Math.floor(Math.random() * 100)}`;
  });

  // Function to connect to a room
  const connectToRoom = (roomName) => {
    setIsLoading(true);
    
    // Determine document type based on room name
    const newDocType = getDocumentType(roomName);
    setDocType(newDocType);
    
    // Clean up previous connection if it exists
    if (provider) {
      try {
        if (provider.awareness) {
          provider.awareness.setLocalState(null);
        }
        provider.disconnect();
      } catch (e) {
        console.error('Error disconnecting from previous room:', e);
      }
    }
    
    if (ydoc) {
      try {
        ydoc.destroy();
      } catch (e) {
        console.error('Error destroying previous document:', e);
      }
    }
    
    // Initialize new Y.js document
    const doc = new Y.Doc();
    
    // Initialize the appropriate shared type based on document type
    if (newDocType === DOC_TYPES.TEXT) {
      const text = doc.getText('editor');
      setYtext(text);
      setYtodoList(null);
      setYcanvasNotes(null);
    } else if (newDocType === DOC_TYPES.TODO) {
      const todoList = doc.getArray('todoList');
      setYtodoList(todoList);
      setYtext(null);
      setYcanvasNotes(null);
    } else if (newDocType === DOC_TYPES.CANVAS) {
      const canvasNotes = doc.getArray('canvasNotes');
      setYcanvasNotes(canvasNotes);
      setYtext(null);
      setYtodoList(null);
    }
    
    setYdoc(doc);

    // Connect to the WebSocket server with the specified room
    // We'll include the document type as a URL parameter
    const wsUrl = `ws://localhost:1234/${roomName}?docType=${newDocType}`;
    console.log(`Connecting to WebSocket at: ${wsUrl}`);
    
    const wsProvider = new WebsocketProvider(
      wsUrl,
      roomName,
      doc
    );
    
    // We'll rely on the URL parameters for document type
    // instead of custom messages to avoid interfering with Y.js protocol
    
    setIsLoading(false);
    return wsProvider;
  };
  
  // Connect to room when it changes
  useEffect(() => {
    const wsProvider = connectToRoom(room);
    
    // Give the provider a moment to initialize
    setTimeout(() => {
      if (wsProvider.awareness) {
        console.log('Setting up awareness state');
        try {
          // Set initial user information
          const userState = {
            user: {
              userid: userId,
              name: username,
              color: '#' + Math.floor(Math.random() * 16777215).toString(16),
            }
          };
          wsProvider.awareness.setLocalState(userState);
        } catch (e) {
          console.error('Error setting initial awareness state:', e);
        }
      } else {
        console.warn('No awareness instance found on provider');
      }
    }, 100);

    // Log connection events
    wsProvider.on('status', event => {
      console.log('WebSocket status changed:', event.status);
      setStatus(event.status);
      
      // When reconnected, make sure to update awareness
      if (event.status === 'connected' && wsProvider.awareness) {
        console.log('Reconnected, updating awareness state');
        try {
          // Update the entire local state
          wsProvider.awareness.setLocalState({
            user: {
              userid: userId,
              name: username,
              color: '#' + Math.floor(Math.random() * 16777215).toString(16),
            }
          });
        } catch (e) {
          console.error('Error updating awareness on reconnect:', e);
        }
      }
    });

    wsProvider.on('sync', isSynced => {
      console.log('Document sync status:', isSynced ? 'synced' : 'not synced');
    });

    // Set up a function to update the users list from awareness states
    const updateUsers = () => {
      try {
        if (wsProvider && wsProvider.awareness) {
          const awarenessStates = Array.from(wsProvider.awareness.getStates().values());
          
          // Filter out states without user information
          const usersWithInfo = awarenessStates
            .filter(state => state.user)
            .map(state => state.user || { 
              userid: 'anonymous', 
              name: 'Anonymous' 
            });
          
          // Remove duplicate users by userid
          const uniqueUserIds = new Set();
          const uniqueUsers = usersWithInfo.filter(user => {
            if (!user.userid || uniqueUserIds.has(user.userid)) {
              return false;
            }
            uniqueUserIds.add(user.userid);
            return true;
          });
          
          console.log('Users updated:', uniqueUsers);
          setUsers(uniqueUsers);
        }
      } catch (e) {
        console.error('Error updating users list:', e);
      }
    };
    
    // Set up awareness change handler after a short delay
    setTimeout(() => {
      try {
        if (wsProvider.awareness) {
          console.log('Setting up awareness change handler');
          // Use the correct event handler for awareness changes
          wsProvider.awareness.on('change', updateUsers);
          // Initial update
          updateUsers();
        } else {
          console.warn('No awareness instance found for change handler');
        }
      } catch (e) {
        console.error('Error setting up awareness change handler:', e);
      }
    }, 200);

    setProvider(wsProvider);

    // Handle window events to clean up awareness state
    const handleBeforeUnload = () => {
      console.log('Window closing, cleaning up awareness state');
      try {
        if (wsProvider.awareness) {
          // Clear local state by setting it to null
          wsProvider.awareness.setLocalState(null);
        }
      } catch (e) {
        console.error('Error clearing awareness state:', e);
      }
      
      try {
        wsProvider.disconnect();
      } catch (e) {
        console.error('Error disconnecting provider:', e);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      try {
        if (wsProvider.awareness) {
          // Remove the event listener
          wsProvider.awareness.off('change', updateUsers);
          // Clear local state
          wsProvider.awareness.setLocalState(null);
        }
      } catch (e) {
        console.error('Error cleaning up:', e);
      }
      
      try {
        wsProvider.disconnect();
      } catch (e) {
        console.error('Error disconnecting provider:', e);
      }
    };
  }, [room, userId, username]);

  // Update user information when username changes
  useEffect(() => {
    if (provider && provider.awareness) {
      try {
        // Get the current user state to preserve color
        const currentState = provider.awareness.getLocalState();
        const currentColor = currentState?.user?.color || '#' + Math.floor(Math.random() * 16777215).toString(16);
        
        // Update the entire local state
        provider.awareness.setLocalState({
          user: {
            userid: userId,
            name: username,
            color: currentColor,
          }
        });
        
        // Save username to localStorage
        localStorage.setItem('collaborativeEditorUsername', username);
      } catch (e) {
        console.error('Error updating username:', e);
      }
    }
  }, [username, provider, userId]);

  // Function to change room
  const changeRoom = (newRoom) => {
    // Update URL without reloading the page
    const url = new URL(window.location.href);
    url.searchParams.set('room', newRoom);
    window.history.pushState({}, '', url);
    
    // Update room state
    setRoom(newRoom);
  };
  
  // Function to create a new room with a specific document type
  const createRoom = (newRoom, newDocType) => {
    // Update URL without reloading the page
    const url = new URL(window.location.href);
    url.searchParams.set('room', newRoom);
    url.searchParams.set('docType', newDocType);
    window.history.pushState({}, '', url);
    
    // Update room state
    setRoom(newRoom);
  };

  const value = {
    ydoc,
    provider,
    ytext,
    ytodoList,
    ycanvasNotes,
    status,
    users,
    userId,
    username,
    setUsername,
    room,
    docType,
    changeRoom,
    createRoom,
    isLoading
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};
