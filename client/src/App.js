import React from 'react';
import { Container } from 'react-bootstrap';
import { EditorProvider } from './EditorContext';
import Editor from './Editor';

const App = () => {
  return (
    <Container fluid>
      <EditorProvider>
        <Editor />
      </EditorProvider>
    </Container>
  );
};

export default App;
