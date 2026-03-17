import http from 'node:http';
import app from './app.js';
import { initChatSocket } from './utils/chatSocket.js';

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);
initChatSocket(httpServer);

const server = httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Kill the old process and restart.`);
    process.exit(1);
  } else {
    throw err;
  }
});

