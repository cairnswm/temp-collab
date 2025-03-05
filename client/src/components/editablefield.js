import React, { useState } from 'react';
import { Button, Form, InputGroup, Navbar } from 'react-bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';

const EditableField = ({ 
  label, 
  value, 
  onSubmit, 
  placeholder, 
  disabled = false,
  alwaysEditable = false
}) => {
  const [isEditing, setIsEditing] = useState(alwaysEditable);
  const [tempValue, setTempValue] = useState(value);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (tempValue.trim()) {
      onSubmit(tempValue.trim());
      if (!alwaysEditable) {
        setIsEditing(false);
      }
    }
  };

  const startEditing = () => {
    setTempValue(value);
    setIsEditing(true);
  };

  if (isEditing || alwaysEditable) {
    return (
      <Form onSubmit={handleSubmit} className="d-flex me-3">
        <InputGroup size="sm">
          <Form.Control
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            placeholder={placeholder}
            size="sm"
            className={alwaysEditable ? "" : "me-2"}
            autoFocus={!alwaysEditable}
            disabled={disabled}
          />
          <Button 
            variant="primary" 
            size="sm" 
            type="submit"
            disabled={disabled || !tempValue.trim()}
          >
            {alwaysEditable ? 'Join' : 'Save'}
          </Button>
        </InputGroup>
      </Form>
    );
  }

  return (
    <Navbar.Text className="me-3">
      {label}: {value} 
      <Button 
        variant="outline-secondary" 
        size="sm" 
        onClick={startEditing}
        className="ms-2"
      >
        <i className="bi bi-pencil"></i>
      </Button>
    </Navbar.Text>
  );
};

export default EditableField;
