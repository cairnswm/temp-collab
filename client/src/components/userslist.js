import React from 'react';
import { ListGroup } from 'react-bootstrap';
import { useEditor } from '../EditorContext';

const UsersList = () => {
  const { users, userId } = useEditor();

  return (
    <div>
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
  );
};

export default UsersList;
