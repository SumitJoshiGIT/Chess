import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import socketApp, { setupSocketIO } from './routes/socket.js';
import gameApp from './routes/game.js';
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
app.route('/socket', socketApp);
app.route('/game', gameApp);
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
    // Stop background processes
    Promise.all([
        import('./controllers/queueProcessor.js').then(({ stopQueueProcessor }) => stopQueueProcessor()),
        import('./controllers/timeoutChecker.js').then(({ stopTimeoutChecker }) => stopTimeoutChecker())
    ]).then(() => {
        process.exit(0);
    }).catch(err => {
        console.error('Error during shutdown:', err);
        process.exit(1);
    });
};
// Register shutdown handlers
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// Start background processes
Promise.all([
    import('./controllers/timeoutChecker.js').then(({ startTimeoutChecker }) => startTimeoutChecker())
]).then(() => {
    console.log(`Chess Game Service running on port ${PORT}`);
}).catch(err => {
    console.error('Error starting background processes:', err);
});
