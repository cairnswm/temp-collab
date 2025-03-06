import React, { useState } from 'react';
import { Navbar, Container, Badge, Button } from 'react-bootstrap';
import { useEditor } from '../EditorContext';
import EditableField from './editablefield';
import RoomCreationModal from './roomcreationmodal';

const Header = () => {
  const { status, username, setUsername, room, changeRoom, isLoading, users } = useEditor();
  const [showRoomModal, setShowRoomModal] = useState(false);

  return (
    <>
      <Navbar bg="light" expand="lg" className="mb-3">
        <Container>
          <Navbar.Brand>Collaborative Editor</Navbar.Brand>
          <Navbar.Text className="me-3">
            Status: <Badge bg={status === 'connected' ? 'success' : 'warning'}>{status}</Badge>
          </Navbar.Text>
          
          <EditableField
            label="Username"
            value={username}
            onSubmit={setUsername}
            placeholder="Enter username"
          />
          
          <div className="d-flex align-items-center">
            <EditableField
              label="Room"
              value={room}
              onSubmit={changeRoom}
              placeholder="Enter room name"
              disabled={isLoading}
            />
            
            <Button 
              variant="outline-primary" 
              size="sm" 
              className="ms-2"
              onClick={() => setShowRoomModal(true)}
              disabled={isLoading}
            >
              New Room
            </Button>
          </div>
          
          <Navbar.Text>
            Users Online: {users.length}
          </Navbar.Text>
        </Container>
      </Navbar>
      
      <RoomCreationModal 
        show={showRoomModal} 
        onHide={() => setShowRoomModal(false)} 
      />
    </>
  );
};

export default Header;
