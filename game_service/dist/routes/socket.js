import { Server } from 'socket.io';
import { Hono } from 'hono';
import { redisClient, makeMove } from '../lib/redis.js';
import { queueForMatch, cancelMatchmaking, checkMatchStatus } from '../controllers/matchmaking.js';
import { checkPromotion } from '../controllers/promotion.js';
import { startQueueProcessor, stopQueueProcessor } from '../controllers/queueProcessor.js';
const socketApp = new Hono();
export const setupSocketIO = (server) => {
    const io = new Server(server, {
        cors: {
            origin: ['http://localhost:3000', 'http://localhost:8080'], // Allow both frontend and test server
            credentials: true,
            methods: ["GET", "POST"]
        },
        transports: ['websocket', 'polling'] // Support both WebSocket and polling
    });
    // Start the matchmaking queue processor with io instance
    startQueueProcessor(io);
    io.on('connection', (socket) => {
        const userId = socket.handshake.auth.userId || 'anonymous';
        const userElo = parseInt(socket.handshake.auth.elo || '1200', 10);
        console.log(`[${new Date().toISOString()}] User connected: userId=${userId}, elo=${userElo}, socketId=${socket.id}`);
        redisClient.hSet('users:online', userId, socket.id);
        // Handle matchmaking request - now simplified, actual matching happens in queue processor
        socket.on('find-match', async ({ gameTypeId }) => {
            try {
                console.log(`[${new Date().toISOString()}] User ${userId} requested matchmaking for gameType ${gameTypeId}`);
                // Queue user for match - actual matching will happen asynchronously
                const result = await queueForMatch(userId, gameTypeId, userElo);
                console.log(`[${new Date().toISOString()}] Matchmaking result for ${userId}: ${JSON.stringify(result)}`);
                // Emit status to the user
                socket.emit('matchmaking-status', result);
                // The queue processor will handle the matching and notify users
            }
            catch (error) {
                console.error(`[${new Date().toISOString()}] Error finding match for ${userId}:`, error);
                socket.emit('error', { message: 'Failed to find match' });
            }
        });
        // Check matchmaking status - simplified status check
        socket.on('check-match-status', async () => {
            try {
                console.log(`[${new Date().toISOString()}] User ${userId} checking match status`);
                const status = await checkMatchStatus(userId);
                console.log(`[${new Date().toISOString()}] Match status for ${userId}: ${JSON.stringify(status)}`);
                socket.emit('matchmaking-status', status);
            }
            catch (error) {
                console.error(`[${new Date().toISOString()}] Error checking match status for ${userId}:`, error);
                socket.emit('error', { message: 'Failed to check match status' });
            }
        });
        // Handle game join when user is notified of a match
        socket.on('join-matched-game', async ({ gameId }) => {
            if (gameId) {
                socket.join(gameId);
                console.log(`[${new Date().toISOString()}] User ${userId} joined matched game: ${gameId}`);
            }
            else {
                console.log(`[${new Date().toISOString()}] User ${userId} tried to join a game without gameId`);
            }
        });
        // Cancel matchmaking
        socket.on('cancel-matchmaking', async () => {
            try {
                console.log(`[${new Date().toISOString()}] User ${userId} cancelling matchmaking`);
                const result = await cancelMatchmaking(userId);
                console.log(`[${new Date().toISOString()}] Matchmaking cancellation for ${userId} result: ${JSON.stringify(result)}`);
                socket.emit('matchmaking-status', result);
            }
            catch (error) {
                console.error(`[${new Date().toISOString()}] Error cancelling matchmaking for ${userId}:`, error);
                socket.emit('error', { message: 'Failed to cancel matchmaking' });
            }
        });
        // Handle chess moves with start and end positions
        socket.on('make-move', async ({ gameId, startX, startY, endX, endY, promotion }) => {
            try {
                console.log(`[${new Date().toISOString()}] User ${userId} making move in game ${gameId}: [${startX},${startY}] to [${endX},${endY}]${promotion ? ` with promotion=${promotion}` : ''}`);
                // Validate position values
                if (!Number.isInteger(startX) || startX < 0 || startX > 7 ||
                    !Number.isInteger(startY) || startY < 0 || startY > 7 ||
                    !Number.isInteger(endX) || endX < 0 || endX > 7 ||
                    !Number.isInteger(endY) || endY < 0 || endY > 7) {
                    console.error(`[${new Date().toISOString()}] Invalid move coordinates from ${userId} in game ${gameId}`);
                    socket.emit('error', { message: 'Invalid move coordinates' });
                    return;
                }
                // Process the move using the helper function
                const updatedState = await makeMove(gameId, userId, {
                    startX,
                    startY,
                    endX,
                    endY,
                    promotion // For pawn promotion (q, r, b, n)
                });
                console.log(`[${new Date().toISOString()}] Move processed for ${userId} in game ${gameId}. New state: ${JSON.stringify(updatedState, null, 2).substring(0, 500)}...`);
                // Check for promotion
                if (updatedState.promotion) {
                    console.log(`[${new Date().toISOString()}] Promotion needed for ${userId} in game ${gameId}`);
                    // Handle promotion (e.g., show promotion options to the player)
                    socket.emit('promote-pawn', {
                        gameId,
                        userId,
                        color: updatedState.turn,
                        position: updatedState.promotion.position,
                        options: updatedState.promotion.options
                    });
                    return;
                }
                // Determine if the game ended
                const isGameOver = updatedState.status !== 'active';
                if (isGameOver) {
                    console.log(`[${new Date().toISOString()}] Game ${gameId} ended with status: ${updatedState.status}, winner: ${updatedState.winner || 'none'}, reason: ${updatedState.endReason || 'unknown'}`);
                }
                // Broadcast move to all players in the game
                io.to(gameId).emit('move-made', {
                    from: { x: startX, y: startY },
                    to: { x: endX, y: endY },
                    by: userId,
                    color: updatedState.turn === 'white' ? 'black' : 'white', // The player who just moved
                    promotion: promotion || null,
                    check: updatedState.check || false,
                    gameState: updatedState
                });
                console.log(`[${new Date().toISOString()}] Move broadcast to all players in game ${gameId}`);
                // If the game is over, emit the game-ended event
                if (isGameOver) {
                    const endData = {
                        result: updatedState.status,
                        reason: updatedState.endReason,
                        winner: updatedState.winner || null
                    };
                    io.to(gameId).emit('game-ended', endData);
                    console.log(`[${new Date().toISOString()}] Game-ended event emitted for game ${gameId}`);
                }
            }
            catch (error) {
                console.error(`[${new Date().toISOString()}] Error processing move in game ${gameId} by ${userId}:`, error);
                socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to process move' });
            }
        });
        // Check if a move requires promotion
        socket.on('check-promotion', async ({ gameId, startX, startY, endX, endY }) => {
            try {
                const result = await checkPromotion(gameId, { startX, startY, endX, endY });
                if (result.needsPromotion) {
                    socket.emit('promotion-required', {
                        from: result.from,
                        to: result.to,
                        color: result.color
                    });
                }
                else {
                    // No promotion needed
                    socket.emit('promotion-not-required');
                }
            }
            catch (error) {
                console.error('Error checking promotion:', error);
                socket.emit('error', { message: error instanceof Error ? error.message : 'Error checking promotion' });
            }
        });
        // Resign from a game
        socket.on('resign', async (gameId) => {
            try {
                const gameStateStr = await redisClient.get(`game:${gameId}:state`);
                if (!gameStateStr)
                    return;
                const gameState = JSON.parse(gameStateStr);
                // Find player's color
                const playerColor = Object.entries(gameState.players).find(([_, id]) => id === userId)?.[0];
                if (!playerColor)
                    return;
                // Update game status
                gameState.status = 'resigned';
                gameState.winner = playerColor === 'white' ? 'black' : 'white';
                gameState.endReason = 'resignation';
                // Save updated state
                await redisClient.set(`game:${gameId}:state`, JSON.stringify(gameState));
                // Notify all players
                io.to(gameId).emit('game-ended', {
                    winner: gameState.winner,
                    reason: 'resignation',
                    by: userId
                });
            }
            catch (error) {
                console.error(`Error handling resignation in game ${gameId}:`, error);
            }
        });
        // Request for draw
        socket.on('offer-draw', async (gameId) => {
            try {
                // Find opponent's socket and send draw offer
                const gameStateStr = await redisClient.get(`game:${gameId}:state`);
                if (!gameStateStr)
                    return;
                const gameState = JSON.parse(gameStateStr);
                // Find opponent
                const playerColor = Object.entries(gameState.players).find(([_, id]) => id === userId)?.[0];
                if (!playerColor)
                    return;
                const opponentColor = playerColor === 'white' ? 'black' : 'white';
                const opponentId = gameState.players[opponentColor];
                if (!opponentId)
                    return;
                // Store draw offer in Redis
                await redisClient.set(`game:${gameId}:draw-offer`, userId, { EX: 60 }); // Expires in 60 seconds
                // Notify opponent
                socket.to(gameId).emit('draw-offered', { by: userId });
            }
            catch (error) {
                console.error(`Error offering draw in game ${gameId}:`, error);
            }
        });
        // Accept draw
        socket.on('accept-draw', async (gameId) => {
            try {
                // Check if draw was offered
                const drawOfferedBy = await redisClient.get(`game:${gameId}:draw-offer`);
                if (!drawOfferedBy || drawOfferedBy === userId) {
                    socket.emit('error', { message: 'No valid draw offer' });
                    return;
                }
                // Update game state
                const gameStateStr = await redisClient.get(`game:${gameId}:state`);
                if (!gameStateStr)
                    return;
                const gameState = JSON.parse(gameStateStr);
                gameState.status = 'drawn';
                gameState.endReason = 'agreement';
                // Save updated state
                await redisClient.set(`game:${gameId}:state`, JSON.stringify(gameState));
                // Delete draw offer
                await redisClient.del(`game:${gameId}:draw-offer`);
                // Notify all players
                io.to(gameId).emit('game-ended', {
                    result: 'draw',
                    reason: 'agreement'
                });
            }
            catch (error) {
                console.error(`Error accepting draw in game ${gameId}:`, error);
            }
        });
        // Handle disconnection
        socket.on('disconnect', async () => {
            try {
                console.log(`[${new Date().toISOString()}] User disconnected: ${userId}, socketId=${socket.id}`);
                // Remove from online users
                await redisClient.hDel('users:online', userId);
                // Cancel any active matchmaking
                await cancelMatchmaking(userId);
                console.log(`[${new Date().toISOString()}] Matchmaking cancelled for disconnected user ${userId}`);
                // Find games this user is part of
                const userGames = await redisClient.keys('game:*:players');
                console.log(`[${new Date().toISOString()}] Found ${userGames.length} potential games for disconnected user ${userId}`);
                // Check each game if user is a player
                for (const gameKey of userGames) {
                    const isMember = await redisClient.sIsMember(gameKey, userId);
                    if (isMember) {
                        const gameId = gameKey.split(':')[1];
                        console.log(`[${new Date().toISOString()}] User ${userId} is a player in game ${gameId} - notifying other players of disconnect`);
                        // Notify others
                        socket.to(gameId).emit('player-disconnected', { userId });
                    }
                }
            }
            catch (error) {
                console.error(`[${new Date().toISOString()}] Error handling disconnection for ${userId}:`, error);
            }
        });
    });
    return io;
};
// Health check route
socketApp.get('/', (c) => {
    return c.json({ status: 'Socket service running' });
});
export default socketApp;
