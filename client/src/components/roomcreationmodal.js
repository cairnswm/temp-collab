import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useEditor, DOC_TYPES } from '../EditorContext';

const RoomCreationModal = ({ show, onHide }) => {
  const { createRoom } = useEditor();
  const [roomName, setRoomName] = useState('');
  const [docType, setDocType] = useState(DOC_TYPES.TEXT);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (roomName.trim()) {
      // Make sure the room name doesn't contain special characters
      const sanitizedRoomName = roomName.trim().replace(/[^a-zA-Z0-9-_]/g, '-');
      
      // Create the room with the selected document type
      createRoom(sanitizedRoomName, docType);
      
      // Close the modal
      onHide();
      
      console.log(`Created new room: ${sanitizedRoomName} with document type: ${docType}`);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create New Room</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Room Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter room name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Document Type</Form.Label>
            <Form.Select 
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              <option value={DOC_TYPES.TEXT}>Text Editor</option>
              <option value={DOC_TYPES.TODO}>Todo List</option>
              <option value={DOC_TYPES.CANVAS}>Canvas</option>
            </Form.Select>
          </Form.Group>
          
          <div className="d-flex justify-content-end">
            <Button variant="secondary" className="me-2" onClick={onHide}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Room
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default RoomCreationModal;
