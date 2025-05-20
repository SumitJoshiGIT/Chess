import { redisClient, createGame, joinGame } from '../lib/redis.js';
// Available game types
const GAME_TYPES = {
    'blitz': {
        id: 'blitz',
        name: 'Blitz',
        timeControl: '3+2',
        description: 'Fast-paced game with 3 minutes + 2 seconds increment',
        duration: 180, // 3 minutes
        increment: 2,
        expiration: 3600 // Keep in Redis for 1 hour
    },
    'rapid': {
        id: 'rapid',
        name: 'Rapid',
        timeControl: '10+5',
        description: 'Standard game with 10 minutes + 5 seconds increment',
        duration: 600, // 10 minutes
        increment: 5,
        expiration: 7200 // Keep in Redis for 2 hours
    },
    'classical': {
        id: 'classical',
        name: 'Classical',
        timeControl: '30+20',
        description: 'Longer game with 30 minutes + 20 seconds increment',
        duration: 1800, // 30 minutes
        increment: 20,
        expiration: 14400 // Keep in Redis for 4 hours
    },
    'bullet': {
        id: 'bullet',
        name: 'Bullet',
        timeControl: '1+0',
        description: 'Ultra-fast game with 1 minute and no increment',
        duration: 60, // 1 minute
        increment: 0,
        expiration: 1800 // Keep in Redis for 30 minutes
    }
};
// Get match queue key for specific game type
function getQueueKey(gameTypeId) {
    return `matchmaking:queue:${gameTypeId}`;
}
async function findEloMatch(gameTypeId, userElo, userId, eloRange = 200) {
    try {
        const queueKey = getQueueKey(gameTypeId);
        const queueMembers = await redisClient.hGetAll(queueKey);
        let bestMatch = null;
        let smallestEloDiff = Infinity;
        for (const [queuedUserId, userDataString] of Object.entries(queueMembers)) {
            if (queuedUserId === userId)
                continue;
            const userData = JSON.parse(String(userDataString));
            const eloDiff = Math.abs(userElo - userData.elo);
            if (eloDiff <= eloRange && eloDiff < smallestEloDiff) {
                smallestEloDiff = eloDiff;
                bestMatch = {
                    userId: queuedUserId,
                    elo: userData.elo,
                    queuedAt: userData.queuedAt
                };
            }
        }
        return bestMatch;
    }
    catch (error) {
        console.error(`Error finding ELO match for game type ${gameTypeId}:`, error);
        return null;
    }
}
// Queue a player for matchmaking
export async function queueForMatch(userId, gameTypeId, userElo) {
    try {
        console.log(`[${new Date().toISOString()}] User ${userId} (ELO: ${userElo}) requesting to queue for ${gameTypeId} match`);
        // Validate game type
        if (!GAME_TYPES[gameTypeId]) {
            console.log(`[${new Date().toISOString()}] Invalid game type requested: ${gameTypeId}`);
            throw new Error(`Invalid game type: ${gameTypeId}`);
        }
        const queueKey = getQueueKey(gameTypeId);
        // Check if user is already in this queue
        const isQueued = await redisClient.hExists(queueKey, userId);
        if (isQueued) {
            console.log(`[${new Date().toISOString()}] User ${userId} is already in queue for ${gameTypeId}`);
            return {
                success: true,
                status: 'already-queued',
                message: `You are already in the matchmaking queue for ${GAME_TYPES[gameTypeId].name}`
            };
        }
        // Add user to matchmaking queue with ELO and timestamp
        const userData = {
            elo: userElo,
            queuedAt: Date.now(),
            gameTypeId
        };
        await redisClient.hSet(queueKey, userId, JSON.stringify(userData));
        console.log(`[${new Date().toISOString()}] User ${userId} added to queue for ${gameTypeId}`);
        // Set up a timeout for the match (2 minutes)
        const matchTimeoutKey = `matchmaking:timeout:${userId}`;
        await redisClient.set(matchTimeoutKey, gameTypeId, { EX: 120 }); // 2 minutes
        console.log(`[${new Date().toISOString()}] Set 2-minute timeout for ${userId} in queue ${gameTypeId}`);
        // The actual matching will be handled by the queue processor
        return {
            success: true,
            status: 'queued',
            message: `Waiting for opponent in ${GAME_TYPES[gameTypeId].name} queue`,
            gameTypeId,
            expiresAt: Date.now() + 120000 // 2 minutes from now
        };
    }
    catch (error) {
        console.error(`[${new Date().toISOString()}] Error queueing ${userId} for match:`, error);
        return {
            success: false,
            status: 'error',
            message: 'Failed to queue for match'
        };
    }
}
// Check if a match has been found
export async function checkMatchStatus(userId) {
    try {
        console.log(`[${new Date().toISOString()}] Checking match status for user ${userId}`);
        // Check if user has an active matchmaking request
        const timeoutKey = `matchmaking:timeout:${userId}`;
        const gameTypeId = await redisClient.get(timeoutKey);
        if (!gameTypeId) {
            // No active matchmaking request
            console.log(`[${new Date().toISOString()}] User ${userId} is not in any matchmaking queue`);
            return {
                success: true,
                status: 'not-queued',
                message: 'You are not in any matchmaking queue'
            };
        }
        // Check if user is still in queue
        const queueKey = getQueueKey(gameTypeId);
        const isInQueue = await redisClient.hExists(queueKey, userId);
        if (!isInQueue) {
            // User was matched or removed from queue
            console.log(`[${new Date().toISOString()}] User ${userId} is no longer in queue for ${gameTypeId}`);
            await redisClient.del(timeoutKey);
            return {
                success: true,
                status: 'no-longer-queued',
                message: 'You are no longer in the matchmaking queue'
            };
        }
        // User is still waiting
        const queueData = await redisClient.hGet(queueKey, userId);
        if (!queueData) {
            console.log(`[${new Date().toISOString()}] User ${userId} has no queue data despite being in queue for ${gameTypeId}`);
            return {
                success: true,
                status: 'waiting',
                message: 'Still looking for a match'
            };
        }
        const userData = JSON.parse(queueData);
        const timeInQueue = Date.now() - userData.queuedAt;
        const timeLeft = Math.max(0, 120000 - timeInQueue); // 2 minutes total
        console.log(`[${new Date().toISOString()}] User ${userId} still waiting in queue ${gameTypeId}. Time in queue: ${timeInQueue / 1000}s, Time left: ${timeLeft / 1000}s`);
        return {
            success: true,
            status: 'waiting',
            message: 'Still looking for a match',
            gameTypeId,
            timeInQueue,
            timeLeft,
            position: 1 // Default position, will be updated by queue processor
        };
    }
    catch (error) {
        console.error(`[${new Date().toISOString()}] Error checking match status for ${userId}:`, error);
        return {
            success: false,
            status: 'error',
            message: 'Failed to check match status'
        };
    }
}
// Cancel matchmaking for a user
export async function cancelMatchmaking(userId) {
    try {
        // Check if user is in an active game
        const userGames = await redisClient.sMembers(`user:${userId}:games`);
        if (userGames.length > 0) {
            // Check if any of these games are active/in progress
            for (const gameId of userGames) {
                const gameExists = await redisClient.exists(`game:${gameId}`);
                if (gameExists) {
                    console.log(`[${new Date().toISOString()}] User ${userId} has active game ${gameId}, not cancelling matchmaking`);
                    return {
                        success: true,
                        message: 'Game already started, not cancelling matchmaking'
                    };
                }
            }
        }
        let wasQueued = false;
        // Check all game type queues
        for (const gameType of Object.keys(GAME_TYPES)) {
            const queueKey = getQueueKey(gameType);
            const wasInQueue = await redisClient.hExists(queueKey, userId);
            if (wasInQueue) {
                // Remove from this queue
                await redisClient.hDel(queueKey, userId);
                wasQueued = true;
            }
        }
        // Clean up timeout key
        await redisClient.del(`matchmaking:timeout:${userId}`);
        if (!wasQueued) {
            return {
                success: false,
                message: 'You are not in any matchmaking queue'
            };
        }
        return {
            success: true,
            message: 'Matchmaking cancelled successfully'
        };
    }
    catch (error) {
        console.error('Error cancelling matchmaking:', error);
        throw new Error('Failed to cancel matchmaking');
    }
}
// List available game types
export function getGameTypes() {
    return Object.values(GAME_TYPES);
}
// Get a specific game type by ID
export function getGameTypeById(gameTypeId) {
    return GAME_TYPES[gameTypeId] || null;
}
export default {
    queueForMatch,
    cancelMatchmaking,
    checkMatchStatus,
    getGameTypes,
    getGameTypeById
};
