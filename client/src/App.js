import React from 'react';
import { Container } from 'react-bootstrap';
import { EditorProvider, useEditor, DOC_TYPES } from './EditorContext';
import Editor from './Editor';
import TodoList from './components/todolist';
import Canvas from './components/canvas';

// Component to conditionally render the appropriate editor based on document type
const DocumentEditor = () => {
  const { docType } = useEditor();
  
  return (
    <>
      {docType === DOC_TYPES.TODO ? (
        <TodoList />
      ) : docType === DOC_TYPES.CANVAS ? (
        <Canvas />
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
