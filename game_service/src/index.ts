import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import gameRoutes from './routes/game.js';
import socketApp, { setupSocketIO } from './routes/socket.js';

const app = new Hono();

// Apply middleware
app.use('*', logger());
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Health check
app.get('/', (c) => {
  return c.json({ status: 'ok', message: 'Chess Game Service API' });
});

// Mount routes
app.route('/api/games', gameRoutes);
app.route('/socket', socketApp);

// Set up server with Socket.io
const PORT = parseInt(process.env.PORT || '8000');
const server = serve({
  fetch: app.fetch,
  port: PORT
});

// Setup Socket.io with the server
const io = setupSocketIO(server);

// Handle graceful shutdown
const shutdown = () => {
  console.log('Shutting down Chess Game Service...');
  
  // Import stopQueueProcessor dynamically to avoid circular dependency
  import('./controllers/queueProcessor.js').then(({ stopQueueProcessor }) => {
    stopQueueProcessor();
    process.exit(0);
  });
};

// Register shutdown handlers
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`Chess Game Service running on port ${PORT}`);
