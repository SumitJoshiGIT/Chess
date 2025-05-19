import { createClient } from 'redis';
import { createGame, joinGame } from '../lib/redis.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Redis client setup
const redisClient = createClient({
  url: REDIS_URL
});

// Connect to Redis when this module is imported
(async () => {
  try {
    await redisClient.connect();
    console.log('Matchmaking: Connected to Redis');
  } catch (error) {
    console.error('Matchmaking: Redis connection error:', error);
  }
})();

// Handle Redis connection errors
redisClient.on('error', (err) => {
  console.error('Matchmaking: Redis connection error:', err);
});

// Game type definitions
interface GameType {
  id: string;
  name: string;
  timeControl: string;
  description: string;
}

// Available game types
const GAME_TYPES: Record<string, GameType> = {
  'blitz': {
    id: 'blitz',
    name: 'Blitz',
    timeControl: '3+2',
    description: 'Fast-paced game with 3 minutes + 2 seconds increment'
  },
  'rapid': {
    id: 'rapid',
    name: 'Rapid',
    timeControl: '10+5',
    description: 'Standard game with 10 minutes + 5 seconds increment'
  },
  'classical': {
    id: 'classical',
    name: 'Classical',
    timeControl: '30+20',
    description: 'Longer game with 30 minutes + 20 seconds increment'
  },
  'bullet': {
    id: 'bullet',
    name: 'Bullet',
    timeControl: '1+0',
    description: 'Ultra-fast game with 1 minute and no increment'
  }
};

// Get match queue key for specific game type
function getQueueKey(gameTypeId: string) {
  return `matchmaking:queue:${gameTypeId}`;
}

// Find suitable match based on ELO
async function findEloMatch(gameTypeId: string, userElo: number, userId: string, eloRange = 200) {
  try {
    // Get all users in this game type's queue
    const queueKey = getQueueKey(gameTypeId);
    const queueMembers = await redisClient.hGetAll(queueKey);
    
    let bestMatch = null;
    let smallestEloDiff = Infinity;
    
    // Find the closest ELO match
    for (const [queuedUserId, userDataString] of Object.entries(queueMembers)) {
      // Skip self
      if (queuedUserId === userId) continue;
      
      const userData = JSON.parse(userDataString);
      const eloDiff = Math.abs(userElo - userData.elo);
      
      // Only consider matches within the ELO range
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
  } catch (error) {
    console.error(`Error finding ELO match for game type ${gameTypeId}:`, error);
    return null;
  }
}

// Queue a player for matchmaking
export async function queueForMatch(userId: string, gameTypeId: string, userElo: number) {
  try {
    // Validate game type
    if (!GAME_TYPES[gameTypeId]) {
      throw new Error(`Invalid game type: ${gameTypeId}`);
    }
    
    const queueKey = getQueueKey(gameTypeId);
    
    // Check if user is already in this queue
    const isQueued = await redisClient.hExists(queueKey, userId);
    
    if (isQueued) {
      return { 
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
    
    // Set up a timeout for the match (2 minutes)
    const matchTimeoutKey = `matchmaking:timeout:${userId}`;
    await redisClient.set(matchTimeoutKey, gameTypeId, { EX: 120 }); // 2 minutes
    
    // The actual matching will be handled by the queue processor
    return { 
      status: 'queued',
      message: `Waiting for opponent in ${GAME_TYPES[gameTypeId].name} queue`,
      gameTypeId,
      expiresAt: Date.now() + 120000 // 2 minutes from now
    };
  } catch (error) {
    console.error('Error queueing for match:', error);
    throw new Error('Failed to queue for match');
  }
}

// Check if a match has been found
export async function checkMatchStatus(userId: string) {
  try {
    // Check if user has an active matchmaking request
    const timeoutKey = `matchmaking:timeout:${userId}`;
    const gameTypeId = await redisClient.get(timeoutKey);
    
    if (!gameTypeId) {
      // No active matchmaking request
      return {
        status: 'not-queued',
        message: 'You are not in any matchmaking queue'
      };
    }
    
    // Check if user is still in queue
    const queueKey = getQueueKey(gameTypeId);
    const isInQueue = await redisClient.hExists(queueKey, userId);
    
    if (!isInQueue) {
      // User was matched or removed from queue
      await redisClient.del(timeoutKey);
      return {
        status: 'no-longer-queued',
        message: 'You are no longer in the matchmaking queue'
      };
    }
    
    // User is still waiting
    const queueData = await redisClient.hGet(queueKey, userId);
    if (!queueData) {
      return {
        status: 'waiting',
        message: 'Still looking for a match'
      };
    }
    
    const userData = JSON.parse(queueData);
    const timeInQueue = Date.now() - userData.queuedAt;
    const timeLeft = Math.max(0, 120000 - timeInQueue); // 2 minutes total
    
    return {
      status: 'waiting',
      message: 'Still looking for a match',
      gameTypeId,
      timeInQueue,
      timeLeft
    };
  } catch (error) {
    console.error('Error checking match status:', error);
    throw new Error('Failed to check match status');
  }
}

// Cancel matchmaking for a user
export async function cancelMatchmaking(userId: string) {
  try {
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
        status: 'not-queued', 
        message: 'You are not in any matchmaking queue' 
      };
    }
    
    return { 
      status: 'cancelled', 
      message: 'Matchmaking cancelled successfully' 
    };
  } catch (error) {
    console.error('Error cancelling matchmaking:', error);
    throw new Error('Failed to cancel matchmaking');
  }
}

// List available game types
export function getGameTypes() {
  return Object.values(GAME_TYPES);
}

export default {
  queueForMatch,
  cancelMatchmaking,
  checkMatchStatus,
  getGameTypes
};