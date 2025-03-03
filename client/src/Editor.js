import React, { useEffect, useRef, useState } from 'react';
import { useEditor } from './EditorContext';
import { Button, ButtonGroup, Navbar, Container, Badge } from 'react-bootstrap';

const Editor = () => {
  const editorRef = useRef();
  const { ydoc, provider, ytext, status, users } = useEditor();
  const [content, setContent] = useState('<p>Start typing here...</p>');

  useEffect(() => {
    if (!ydoc || !provider || !ytext || !editorRef.current) return;

    // Initialize the editor with the current content
    editorRef.current.innerHTML = content;
    
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
    
    // Make the div editable
    editorRef.current.contentEditable = true;
    
    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener('input', handleInput);
      }
    };
  }, [ydoc, provider, ytext]);

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

  return (
    <div className="editor-wrapper">
      <Navbar bg="light" expand="lg" className="mb-3">
        <Container>
          <Navbar.Brand>Collaborative Editor</Navbar.Brand>
          <Navbar.Text>
            Status: <Badge bg={status === 'connected' ? 'success' : 'warning'}>{status}</Badge>
          </Navbar.Text>
          <Navbar.Text>
            Users Online: {users.length}
          </Navbar.Text>
        </Container>
      </Navbar>

      <div className="editor-toolbar">
        <ButtonGroup>
          <Button variant="outline-secondary" onClick={handleBold}>Bold</Button>
          <Button variant="outline-secondary" onClick={handleItalic}>Italic</Button>
          <Button variant="outline-secondary" onClick={handleUnderline}>Underline</Button>
        </ButtonGroup>
      </div>

      <div className="editor-container">
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
      </div>
    </div>
  );
};

export default Editor;
