
import React, { createContext, useState, useEffect, useContext } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const EditorContext = createContext();

export const useEditor = () => useContext(EditorContext);

export const EditorProvider = ({ children }) => {
  const [ydoc, setYdoc] = useState(null);
  const [provider, setProvider] = useState(null);
  const [ytext, setYtext] = useState(null);
  const [status, setStatus] = useState('disconnected');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Initialize Y.js document
    const doc = new Y.Doc();
    const text = doc.getText('editor');
    setYdoc(doc);
    setYtext(text);

    // Connect to the WebSocket server
    const wsProvider = new WebsocketProvider(
      'ws://localhost:1234',
      'collaborative-editor',
      doc,
      { connect: true }
    );

    // Log connection events
    wsProvider.on('status', event => {
      console.log('WebSocket status changed:', event.status);
      setStatus(event.status);
    });

    wsProvider.on('sync', isSynced => {
      console.log('Document sync status:', isSynced ? 'synced' : 'not synced');
    });

    wsProvider.awareness.on('change', () => {
      const awarenessStates = Array.from(wsProvider.awareness.getStates().values());
      setUsers(awarenessStates.map(state => state.user || { name: 'Anonymous' }));
    });

    // Set user information
    wsProvider.awareness.setLocalStateField('user', {
      name: 'User ' + Math.floor(Math.random() * 100),
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    });

    setProvider(wsProvider);

    return () => {
      wsProvider.disconnect();
      doc.destroy();
    };
  }, []);

  const value = {
    ydoc,
    provider,
    ytext,
    status,
    users,
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};
