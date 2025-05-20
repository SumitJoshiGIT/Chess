import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getGame, getAllGames, createGame, joinGame, checkGameTimeout, saveCompletedGameToMongoDB } from '../lib/redis.js';
import { executeMove, resignGame, offerDraw, acceptDraw } from '../controllers/play.js';
const gameApp = new Hono();
// Get all games
gameApp.get('/', async (c) => {
    try {
        // Get query parameters
        const status = c.req.query('status');
        const userId = c.req.query('userId');
        const gameType = c.req.query('gameType');
        const limit = parseInt(c.req.query('limit') || '20');
        // Get games, applying filters
        const games = await getAllGames({ status, userId, gameType, limit });
        return c.json({ success: true, games });
    }
    catch (error) {
        console.error('Error fetching games:', error);
        return c.json({ success: false, error: 'Failed to fetch games' }, 500);
    }
});
// Get a specific game
gameApp.get('/:gameId', async (c) => {
    try {
        const gameId = c.req.param('gameId');
        // First check if the game has timed out
        await checkGameTimeout(gameId);
        // Get the game state
        const game = await getGame(gameId);
        if (!game) {
            return c.json({ success: false, error: 'Game not found' }, 404);
        }
        return c.json({ success: true, game });
    }
    catch (error) {
        console.error('Error fetching game:', error);
        return c.json({ success: false, error: 'Failed to fetch game' }, 500);
    }
});
// Create a new game
gameApp.post('/', zValidator('json', z.object({
    userId: z.string(),
    gameType: z.string().optional()
})), async (c) => {
    try {
        const { userId, gameType } = c.req.valid('json');
        // Create a new game
        const { gameId, game } = await createGame(userId, undefined, gameType);
        return c.json({ success: true, gameId, game });
    }
    catch (error) {
        console.error('Error creating game:', error);
        return c.json({ success: false, error: 'Failed to create game' }, 500);
    }
});
// Join a game
gameApp.post('/:gameId/join', zValidator('json', z.object({
    userId: z.string()
})), async (c) => {
    try {
        const gameId = c.req.param('gameId');
        const { userId } = c.req.valid('json');
        // Join the game
        const game = await joinGame(gameId, userId);
        return c.json({ success: true, game });
    }
    catch (error) {
        console.error('Error joining game:', error);
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to join game' }, 400);
    }
});
// Make a move
gameApp.post('/:gameId/move', zValidator('json', z.object({
    userId: z.string(),
    startX: z.number().int().min(0).max(7),
    startY: z.number().int().min(0).max(7),
    endX: z.number().int().min(0).max(7),
    endY: z.number().int().min(0).max(7),
    promotion: z.string().optional()
})), async (c) => {
    try {
        const gameId = c.req.param('gameId');
        const { userId, startX, startY, endX, endY, promotion } = c.req.valid('json');
        // Execute the move
        const game = await executeMove(gameId, userId, { startX, startY, endX, endY, promotion });
        return c.json({ success: true, game });
    }
    catch (error) {
        console.error('Error making move:', error);
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to make move' }, 400);
    }
});
// Resign a game
gameApp.post('/:gameId/resign', zValidator('json', z.object({
    userId: z.string()
})), async (c) => {
    try {
        const gameId = c.req.param('gameId');
        const { userId } = c.req.valid('json');
        // Resign the game
        const game = await resignGame(gameId, userId);
        return c.json({ success: true, game });
    }
    catch (error) {
        console.error('Error resigning game:', error);
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to resign game' }, 400);
    }
});
// Offer a draw
gameApp.post('/:gameId/offer-draw', zValidator('json', z.object({
    userId: z.string()
})), async (c) => {
    try {
        const gameId = c.req.param('gameId');
        const { userId } = c.req.valid('json');
        // Offer a draw
        const game = await offerDraw(gameId, userId);
        return c.json({ success: true, game });
    }
    catch (error) {
        console.error('Error offering draw:', error);
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to offer draw' }, 400);
    }
});
// Accept a draw
gameApp.post('/:gameId/accept-draw', zValidator('json', z.object({
    userId: z.string()
})), async (c) => {
    try {
        const gameId = c.req.param('gameId');
        const { userId } = c.req.valid('json');
        // Accept the draw
        const game = await acceptDraw(gameId, userId);
        return c.json({ success: true, game });
    }
    catch (error) {
        console.error('Error accepting draw:', error);
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to accept draw' }, 400);
    }
});
// Save a game to MongoDB (admin or system operation)
gameApp.post('/:gameId/save', zValidator('json', z.object({
    apiKey: z.string() // For security, require an API key
})), async (c) => {
    try {
        const gameId = c.req.param('gameId');
        const { apiKey } = c.req.valid('json');
        // Verify API key
        const validApiKey = process.env.ADMIN_API_KEY;
        if (!validApiKey || apiKey !== validApiKey) {
            return c.json({ success: false, error: 'Invalid API key' }, 403);
        }
        // Save to MongoDB
        const saved = await saveCompletedGameToMongoDB(gameId);
        if (!saved) {
            return c.json({ success: false, error: 'Game not eligible for saving' }, 400);
        }
        return c.json({ success: true, message: 'Game saved to MongoDB' });
    }
    catch (error) {
        console.error('Error saving game to MongoDB:', error);
        return c.json({ success: false, error: 'Failed to save game' }, 500);
    }
});
export default gameApp;
