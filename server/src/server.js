import http from 'node:http';
import app from './app.js';
import { initChatSocket } from './utils/chatSocket.js';
import { expertRepository } from './repositories/expertRepository.js';
import notificationService from './services/notificationService.js';
import reportService from './services/reportService.js';

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);
const io = initChatSocket(httpServer);
app.set('io', io);

// Set the io instance for notification service
notificationService.setSocketIO(io);

try {
  await expertRepository.ensureBookmarkTable();
} catch (error) {
  console.warn('Bookmark table initialization skipped:', error.message);
}

try {
  await notificationService.ensureNotificationTablesExist();
} catch (error) {
  console.warn('Notification table initialization skipped:', error.message);
}

try {
  await reportService.ensureReportsTableExists();
} catch (error) {
  console.warn('Reports table initialization skipped:', error.message);
}

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

