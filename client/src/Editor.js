import React, { useEffect, useRef, useState } from 'react';
import { useEditor } from './EditorContext';
import { Button, ButtonGroup, Navbar, Container, Badge, Form, ListGroup, InputGroup } from 'react-bootstrap';

const Editor = () => {
  const editorRef = useRef();
  const { ydoc, provider, ytext, status, users, userId, username, setUsername, room, changeRoom, isLoading } = useEditor();
  const [editingUsername, setEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState(username);
  const [newRoomName, setNewRoomName] = useState('');
  const [content, setContent] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!ydoc || !provider || !ytext || !editorRef.current) return;

    // Initialize the editor with the current content from the shared document
    const initialContent = ytext.toString();
    const contentToUse = initialContent || '<p>Start typing here...</p>';
    
    editorRef.current.innerHTML = contentToUse;
    setContent(contentToUse);
    
    // Mark as initialized after we've set the initial content
    setIsInitialized(true);
    
    console.log('Editor initialized with content:', contentToUse);
    
    // Track if we're currently updating from a remote change
    let updatingFromRemote = false;
    
    // Function to save cursor position
    const saveCursorPosition = () => {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        return {
          range: selection.getRangeAt(0).cloneRange(),
          startContainer: selection.anchorNode,
          startOffset: selection.anchorOffset,
          endContainer: selection.focusNode,
          endOffset: selection.focusOffset
        };
      }
      return null;
    };
    
    // Function to restore cursor position
    const restoreCursorPosition = (savedPosition) => {
      if (!savedPosition) return;
      
      try {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedPosition.range);
      } catch (e) {
        console.error('Error restoring cursor position:', e);
      }
    };
    
    // Set up event listeners for content changes
    const handleInput = () => {
      // Skip if we're currently updating from a remote change
      if (updatingFromRemote) return;
      
      const newContent = editorRef.current.innerHTML;
      console.log('Local input detected, new content:', newContent);
      
      // Save cursor position before updating
      const savedPosition = saveCursorPosition();
      
      // Update the content state
      setContent(newContent);
      
      // Use a transaction to update the shared document
      ydoc.transact(() => {
        ytext.delete(0, ytext.length);
        ytext.insert(0, newContent);
      }, 'local');
      
      // Restore cursor position after update
      setTimeout(() => restoreCursorPosition(savedPosition), 0);
    };
    
    editorRef.current.addEventListener('input', handleInput);
    
    // Listen for changes from other users
    ytext.observe(event => {
      // Only update if the change came from another user
      if (event.transaction.origin !== 'local') {
        console.log('Remote update received:', event.delta);
        
        // Mark that we're updating from remote to prevent input handler from firing
        updatingFromRemote = true;
        
        // Save cursor position
        const savedPosition = saveCursorPosition();
        
        // Update content
        const newContent = ytext.toString();
        editorRef.current.innerHTML = newContent;
        setContent(newContent);
        
        // Restore cursor position and reset flag
        setTimeout(() => {
          restoreCursorPosition(savedPosition);
          updatingFromRemote = false;
        }, 0);
      }
    });
    
    // Listen for sync events to know when we've received the initial document state
    provider.on('sync', isSynced => {
      if (isSynced && !isInitialized) {
        console.log('Document synced, updating content from server');
        const syncedContent = ytext.toString();
        
        if (syncedContent && syncedContent !== editorRef.current.innerHTML) {
          editorRef.current.innerHTML = syncedContent;
          setContent(syncedContent);
          setIsInitialized(true);
        }
      }
    });
    
    // Make the div editable
    editorRef.current.contentEditable = true;
    
    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener('input', handleInput);
      }
    };
  }, [ydoc, provider, ytext, isInitialized]);

  const handleBold = () => {
    document.execCommand('bold', false, null);
    editorRef.current.focus();
  };

  const handleItalic = () => {
    document.execCommand('italic', false, null);
    editorRef.current.focus();
  };

  const handleUnderline = () => {
    document.execCommand('underline', false, null);
    editorRef.current.focus();
  };

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (tempUsername.trim()) {
      setUsername(tempUsername.trim());
      setEditingUsername(false);
    }
  };

  const handleRoomSubmit = (e) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      changeRoom(newRoomName.trim());
      setNewRoomName('');
    }
  };

  return (
    <div className="editor-wrapper">
      <Navbar bg="light" expand="lg" className="mb-3">
        <Container>
          <Navbar.Brand>Collaborative Editor</Navbar.Brand>
          <Navbar.Text className="me-3">
            Status: <Badge bg={status === 'connected' ? 'success' : 'warning'}>{status}</Badge>
          </Navbar.Text>
          
          {editingUsername ? (
            <Form onSubmit={handleUsernameSubmit} className="d-flex me-3">
              <Form.Control
                type="text"
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                placeholder="Enter username"
                size="sm"
                className="me-2"
                autoFocus
              />
              <Button variant="primary" size="sm" type="submit">Save</Button>
            </Form>
          ) : (
            <Navbar.Text className="me-3">
              Username: {username} 
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => {
                  setTempUsername(username);
                  setEditingUsername(true);
                }}
              >
                Edit
              </Button>
            </Navbar.Text>
          )}
          
          <Navbar.Text className="me-3">
            Room: {room}
          </Navbar.Text>
          
          <Form onSubmit={handleRoomSubmit} className="d-flex me-3">
            <InputGroup size="sm">
              <Form.Control
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Enter room name"
                size="sm"
                disabled={isLoading}
              />
              <Button 
                variant="primary" 
                size="sm" 
                type="submit"
                disabled={isLoading || !newRoomName.trim()}
              >
                {isLoading ? 'Connecting...' : 'Join Room'}
              </Button>
            </InputGroup>
          </Form>
          
          <Navbar.Text>
            Users Online: {users.length}
          </Navbar.Text>
        </Container>
      </Navbar>
      
      <div className="d-flex">
        <div className="flex-grow-1 me-3">

          <div className="editor-toolbar mb-2">
            <ButtonGroup>
              <Button variant="outline-secondary" onClick={handleBold}>Bold</Button>
              <Button variant="outline-secondary" onClick={handleItalic}>Italic</Button>
              <Button variant="outline-secondary" onClick={handleUnderline}>Underline</Button>
            </ButtonGroup>
          </div>

          <div className="editor-container">
            {isLoading ? (
              <div 
                className="d-flex justify-content-center align-items-center"
                style={{ 
                  minHeight: '300px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px', 
                  padding: '10px'
                }}
              >
                <div>Loading document...</div>
              </div>
            ) : (
              <div 
                ref={editorRef} 
                className="content-editable"
                style={{ 
                  minHeight: '300px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px', 
                  padding: '10px',
                  outline: 'none'
                }}
              />
            )}
          </div>
        </div>
        
        <div style={{ width: '200px' }}>
          <h5>Connected Users</h5>
          <ListGroup>
            {users.length > 0 ? (
              users.map((user) => (
                <ListGroup.Item 
                  key={user.userid || Math.random().toString(36).substring(2)}
                  className="d-flex align-items-center"
                >
                  <div 
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: user.color || '#ccc',
                      marginRight: '8px'
                    }}
                  />
                  {user.name || 'Anonymous'} {user.userid === userId && '(you)'}
                </ListGroup.Item>
              ))
            ) : (
              <ListGroup.Item>No users connected</ListGroup.Item>
            )}
          </ListGroup>
        </div>
      </div>
    </div>
  );
};

export default Editor;
