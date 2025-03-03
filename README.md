# Collaborative Editor

A real-time collaborative text editor application with HTML formatting capabilities.

## Features

- Real-time collaboration using Y.js and WebSockets
- Rich text editing with contentEditable
- HTML formatted text editing
- User presence awareness
- Bootstrap UI components

## Tech Stack

- **Client**: React, Y.js, Bootstrap, Webpack, contentEditable
- **Server**: Node.js, Express, WebSockets, Y.js

## Setup

1. Install dependencies for the root project, client, and server:

```bash
npm run install:all
```

2. Start the development server:

```bash
npm run dev
```

This will start both the client and server concurrently:
- Client: http://localhost:3000
- Server: http://localhost:1234

## Project Structure

```
collaborative-editor/
├── client/                 # React client application
│   ├── public/             # Static files
│   ├── src/                # React source code
│   ├── package.json        # Client dependencies
│   └── webpack.config.js   # Webpack configuration
├── server/                 # Node.js server
│   ├── index.js            # Server implementation
│   └── package.json        # Server dependencies
└── package.json            # Root package.json for scripts
```

## How It Works

- The server uses WebSockets to establish real-time communication between clients
- Y.js provides the CRDT (Conflict-free Replicated Data Type) implementation for handling concurrent edits
- contentEditable provides the rich text editing capabilities
- React and Bootstrap are used for the UI components
