import React from 'react';
import { Navbar, Container, Badge } from 'react-bootstrap';
import { useEditor } from '../EditorContext';
import EditableField from './editablefield';

const Header = () => {
  const { status, username, setUsername, room, changeRoom, isLoading, users } = useEditor();

  return (
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
        
        <EditableField
          label="Room"
          value={room}
          onSubmit={changeRoom}
          placeholder="Enter room name"
          disabled={isLoading}
        />
        
        <Navbar.Text>
          Users Online: {users.length}
        </Navbar.Text>
      </Container>
    </Navbar>
  );
};

export default Header;
