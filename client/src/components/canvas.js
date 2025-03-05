import React, { useState, useEffect, useRef } from 'react';
import { useEditor, DOC_TYPES } from '../EditorContext';
import { Button, Form, Modal, Card, ButtonGroup } from 'react-bootstrap';
import Header from './header';
import UsersList from './userslist';

const Canvas = () => {
  const { ycanvasNotes, docType, isLoading, users, userId } = useEditor();
  const [notes, setNotes] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentNote, setCurrentNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteColor, setNoteColor] = useState('blue');
  const canvasRef = useRef(null);
  const [draggedNote, setDraggedNote] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState(false);

  // Available note colors
  const noteColors = ['blue', 'green', 'yellow', 'pink', 'purple'];

  // Initialize and sync with the shared canvas notes
  useEffect(() => {
    if (!ycanvasNotes || docType !== DOC_TYPES.CANVAS) return;

    // Get initial notes
    const initialNotes = ycanvasNotes.toArray();
    setNotes(initialNotes);
    setIsInitialized(true);

    // Track if we're currently updating from a remote change
    let updatingFromRemote = false;

    // Listen for changes from other users
    ycanvasNotes.observe(event => {
      // Only update if the change came from another user
      if (!updatingFromRemote) {
        console.log('Canvas notes update received:', event.delta);
        
        // Update notes state
        const updatedNotes = ycanvasNotes.toArray();
        setNotes(updatedNotes);
      }
    });

  }, [ycanvasNotes, docType]);

  // Handle mouse down on a note (start dragging)
  const handleNoteMouseDown = (e, note) => {
    // Only allow dragging if it's not in edit mode
    if (isEditing) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDraggedNote(note);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.stopPropagation();
  };

  // Handle mouse move on the canvas (drag note)
  const handleCanvasMouseMove = (e) => {
    if (!draggedNote || isEditing) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newX = e.clientX - canvasRect.left - dragOffset.x;
    const newY = e.clientY - canvasRect.top - dragOffset.y;
    
    // Ensure the note stays within the canvas bounds
    const boundedX = Math.max(0, Math.min(newX, canvasRect.width - 200));
    const boundedY = Math.max(0, Math.min(newY, canvasRect.height - 150));
    
    // Update the note position locally
    const updatedNotes = notes.map(n => 
      n.id === draggedNote.id 
        ? { ...n, location: { x: boundedX, y: boundedY } } 
        : n
    );
    
    setNotes(updatedNotes);
  };

  // Handle mouse up on the canvas (end dragging)
  const handleCanvasMouseUp = () => {
    if (!draggedNote || isEditing) return;
    
    // Find the updated note with its new position
    const updatedNote = notes.find(n => n.id === draggedNote.id);
    if (!updatedNote) return;
    
    // Update the note in the shared array
    const noteIndex = notes.findIndex(n => n.id === draggedNote.id);
    if (noteIndex !== -1 && ycanvasNotes) {
      ycanvasNotes.delete(noteIndex, 1);
      ycanvasNotes.insert(noteIndex, [updatedNote]);
    }
    
    setDraggedNote(null);
  };

  // Handle adding a new note
  const handleAddNote = (e) => {
    // Only add a note if we're not in edit mode and not dragging
    if (isEditing || draggedNote) return;
    
    if (!ycanvasNotes) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;
    
    // Open the modal for adding a new note
    setCurrentNote({
      id: Date.now(),
      text: '',
      color: noteColor,
      location: { x, y },
      createdBy: userId
    });
    setNoteText('');
    setShowModal(true);
    setIsEditing(true);
  };

  // Handle saving a note (new or edited)
  const handleSaveNote = () => {
    if (!ycanvasNotes || !currentNote) return;
    
    const updatedNote = {
      ...currentNote,
      text: noteText,
      color: noteColor
    };
    
    if (notes.some(note => note.id === currentNote.id)) {
      // Editing an existing note
      const noteIndex = notes.findIndex(note => note.id === currentNote.id);
      if (noteIndex !== -1) {
        ycanvasNotes.delete(noteIndex, 1);
        ycanvasNotes.insert(noteIndex, [updatedNote]);
      }
    } else {
      // Adding a new note
      ycanvasNotes.push([updatedNote]);
    }
    
    setShowModal(false);
    setCurrentNote(null);
    setIsEditing(false);
  };

  // Handle editing a note
  const handleEditNote = (note) => {
    setCurrentNote(note);
    setNoteText(note.text);
    setNoteColor(note.color);
    setShowModal(true);
    setIsEditing(true);
  };

  // Handle deleting a note
  const handleDeleteNote = (noteId) => {
    if (!ycanvasNotes) return;
    
    const noteIndex = notes.findIndex(note => note.id === noteId);
    if (noteIndex !== -1) {
      ycanvasNotes.delete(noteIndex, 1);
    }
    
    setShowModal(false);
    setCurrentNote(null);
    setIsEditing(false);
  };

  // Get user name by ID
  const getUserName = (userId) => {
    const user = users.find(u => u.userid === userId);
    return user ? user.name : 'Unknown User';
  };

  return (
    <div className="canvas-wrapper">
      <Header />
      
      <div className="d-flex">
        <div className="flex-grow-1 me-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Collaborative Canvas</h3>
            <div>
              <span className="me-2">Note Color:</span>
              <ButtonGroup>
                {noteColors.map(color => (
                  <Button
                    key={color}
                    variant={noteColor === color ? color : `outline-${color}`}
                    onClick={() => setNoteColor(color)}
                    style={{ width: '30px', height: '30px' }}
                  />
                ))}
              </ButtonGroup>
            </div>
          </div>
          
          {isLoading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '500px' }}>
              <div>Loading canvas...</div>
            </div>
          ) : (
            <div 
              ref={canvasRef}
              className="canvas-container"
              style={{ 
                position: 'relative', 
                height: '600px', 
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: '#f8f9fa',
                overflow: 'hidden'
              }}
              onClick={handleAddNote}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            >
              {notes.map(note => (
                <Card
                  key={note.id}
                  className="note-card"
                  style={{
                    position: 'absolute',
                    left: `${note.location.x}px`,
                    top: `${note.location.y}px`,
                    width: '200px',
                    backgroundColor: note.color === 'blue' ? '#cfe2ff' :
                                     note.color === 'green' ? '#d1e7dd' :
                                     note.color === 'yellow' ? '#fff3cd' :
                                     note.color === 'pink' ? '#f8d7da' :
                                     note.color === 'purple' ? '#e2d9f3' : '#cfe2ff',
                    borderColor: note.color === 'blue' ? '#9ec5fe' :
                                 note.color === 'green' ? '#a3cfbb' :
                                 note.color === 'yellow' ? '#ffe69c' :
                                 note.color === 'pink' ? '#f5c2c7' :
                                 note.color === 'purple' ? '#c5b8e8' : '#9ec5fe',
                    cursor: 'move',
                    zIndex: draggedNote && draggedNote.id === note.id ? 1000 : 1
                  }}
                  onMouseDown={(e) => handleNoteMouseDown(e, note)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Card.Header className="d-flex justify-content-between align-items-center py-1">
                    <small>{getUserName(note.createdBy)}</small>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 text-dark"
                      onClick={() => handleEditNote(note)}
                    >
                      Edit
                    </Button>
                  </Card.Header>
                  <Card.Body className="p-2">
                    <Card.Text style={{ whiteSpace: 'pre-wrap' }}>
                      {note.text}
                    </Card.Text>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
          
          <div className="mt-2 text-muted">
            <small>Click anywhere on the canvas to add a new note. Drag notes to move them.</small>
          </div>
        </div>
        
        <div style={{ width: '200px' }}>
          <UsersList />
        </div>
      </div>
      
      {/* Modal for adding/editing notes */}
      <Modal show={showModal} onHide={() => { setShowModal(false); setIsEditing(false); }}>
        <Modal.Header closeButton>
          <Modal.Title>{currentNote && notes.some(note => note.id === currentNote.id) ? 'Edit Note' : 'Add Note'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Note Text</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter note text..."
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Note Color</Form.Label>
              <div>
                <ButtonGroup>
                  {noteColors.map(color => (
                    <Button
                      key={color}
                      variant={color === 'blue' ? 'primary' : 
                              color === 'green' ? 'success' : 
                              color === 'yellow' ? 'warning' : 
                              color === 'pink' ? 'danger' : 
                              color === 'purple' ? 'secondary' : 'primary'}
                      active={noteColor === color}
                      onClick={() => setNoteColor(color)}
                      style={{ 
                        width: '40px', 
                        height: '40px',
                        opacity: noteColor === color ? 1 : 0.6,
                        border: noteColor === color ? '2px solid #000' : '1px solid #ced4da'
                      }}
                    />
                  ))}
                </ButtonGroup>
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          {currentNote && notes.some(note => note.id === currentNote.id) && (
            <Button 
              variant="danger" 
              onClick={() => handleDeleteNote(currentNote.id)}
            >
              Delete
            </Button>
          )}
          <Button 
            variant="secondary" 
            onClick={() => { setShowModal(false); setIsEditing(false); }}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSaveNote}
            disabled={!noteText.trim()}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Canvas;
