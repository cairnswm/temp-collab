import React, { useState, useEffect } from 'react';
import { useEditor, DOC_TYPES } from '../EditorContext';
import { ListGroup, Form, Button, InputGroup } from 'react-bootstrap';
import Header from './header';
import UsersList from './userslist';

const TodoList = () => {
  const { ytodoList, docType, isLoading } = useEditor();
  const [todos, setTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize and sync with the shared todo list
  useEffect(() => {
    if (!ytodoList || docType !== DOC_TYPES.TODO) return;

    // Get initial todos
    const initialTodos = ytodoList.toArray();
    setTodos(initialTodos);
    setIsInitialized(true);

    // Track if we're currently updating from a remote change
    let updatingFromRemote = false;

    // Listen for changes from other users
    ytodoList.observe(event => {
      // Only update if the change came from another user
      if (!updatingFromRemote) {
        console.log('Todo list update received:', event.delta);
        
        // Update todos state
        const updatedTodos = ytodoList.toArray();
        setTodos(updatedTodos);
      }
    });

  }, [ytodoList, docType]);

  // Add a new todo item
  const handleAddTodo = () => {
    if (!newTodoText.trim() || !ytodoList) return;

    const newTodo = {
      id: Date.now(),
      name: newTodoText.trim(),
      checked: false
    };

    // Add to the shared list
    ytodoList.push([newTodo]);
    
    // Update local state
    setTodos([...todos, newTodo]);
    
    // Clear input
    setNewTodoText('');
  };

  // Toggle todo checked state
  const handleToggleTodo = (id) => {
    if (!ytodoList) return;

    // Find the todo in our local state
    const todoIndex = todos.findIndex(todo => todo.id === id);
    if (todoIndex === -1) return;

    // Create updated todo with toggled checked state
    const updatedTodo = {
      ...todos[todoIndex],
      checked: !todos[todoIndex].checked
    };

    // Update in the shared list
    ytodoList.delete(todoIndex, 1);
    ytodoList.insert(todoIndex, [updatedTodo]);

    // Update local state
    const newTodos = [...todos];
    newTodos[todoIndex] = updatedTodo;
    setTodos(newTodos);
  };

  // Delete a todo
  const handleDeleteTodo = (id) => {
    if (!ytodoList) return;

    // Find the todo in our local state
    const todoIndex = todos.findIndex(todo => todo.id === id);
    if (todoIndex === -1) return;

    // Delete from the shared list
    ytodoList.delete(todoIndex, 1);

    // Update local state
    const newTodos = todos.filter(todo => todo.id !== id);
    setTodos(newTodos);
  };

  // Handle input change for new todo
  const handleInputChange = (e) => {
    setNewTodoText(e.target.value);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    handleAddTodo();
  };

  return (
    <div className="todo-list-wrapper">
      <Header />
      
      <div className="d-flex">
        <div className="flex-grow-1 me-3">
          <h3 className="mb-3">Collaborative Todo List</h3>
          
          {isLoading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
              <div>Loading todo list...</div>
            </div>
          ) : (
            <>
              <Form onSubmit={handleSubmit} className="mb-3">
                <InputGroup>
                  <Form.Control
                    type="text"
                    value={newTodoText}
                    onChange={handleInputChange}
                    placeholder="Add a new item..."
                    aria-label="Add a new todo item"
                  />
                  <Button variant="primary" type="submit" disabled={!newTodoText.trim()}>
                    Add
                  </Button>
                </InputGroup>
              </Form>

              <ListGroup className="mb-4">
                {todos.length > 0 ? (
                  todos.map((todo) => (
                    <ListGroup.Item key={todo.id} className="d-flex justify-content-between align-items-center">
                      <Form.Check
                        type="checkbox"
                        id={`todo-${todo.id}`}
                        label={todo.name}
                        checked={todo.checked}
                        onChange={() => handleToggleTodo(todo.id)}
                        className="flex-grow-1"
                      />
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleDeleteTodo(todo.id)}
                      >
                        Delete
                      </Button>
                    </ListGroup.Item>
                  ))
                ) : (
                  <ListGroup.Item className="text-center">No items in the list. Add one above!</ListGroup.Item>
                )}
              </ListGroup>
            </>
          )}
        </div>
        
        <div style={{ width: '200px' }}>
          <UsersList />
        </div>
      </div>
    </div>
  );
};

export default TodoList;
