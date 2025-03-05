import React from 'react';
import { Container } from 'react-bootstrap';
import { EditorProvider, useEditor, DOC_TYPES } from './EditorContext';
import Editor from './Editor';
import TodoList from './components/todolist';

// Component to conditionally render the appropriate editor based on document type
const DocumentEditor = () => {
  const { docType } = useEditor();
  
  return (
    <>
      {docType === DOC_TYPES.TODO ? (
        <TodoList />
      ) : (
        <Editor />
      )}
    </>
  );
};

const App = () => {
  return (
    <Container fluid>
      <EditorProvider>
        <DocumentEditor />
      </EditorProvider>
    </Container>
  );
};

export default App;
