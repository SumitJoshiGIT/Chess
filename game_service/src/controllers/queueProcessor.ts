import { createClient } from 'redis';
import { createGame } from '../lib/redis.js';
import { getGameTypes } from './matchmaking.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const MATCH_TIMEOUT_SECONDS = 120; // 2 minutes
const ELO_RANGE_INITIAL = 100;
const ELO_RANGE_INCREMENT = 50;
const ELO_RANGE_MAX = 400;
const PROCESSOR_INTERVAL_MS = 5000; // 5 seconds

// Redis client setup
const redisClient = createClient({
  url: REDIS_URL
});

// Connect to Redis when this module is imported
(async () => {
  try {
    await redisClient.connect();
    console.log('Queue Processor: Connected to Redis');
  } catch (error) {
    console.error('Queue Processor: Redis connection error:', error);
  }
})();

// Handle Redis connection errors
redisClient.on('error', (err) => {
  console.error('Queue Processor: Redis connection error:', err);
});

// Get match queue key for specific game type
function getQueueKey(gameTypeId: string) {
  return `matchmaking:queue:${gameTypeId}`;
}

// Process the matchmaking queue for a specific game type
async function processQueueForGameType(gameTypeId: string, io: any) {
  try {
    const queueKey = getQueueKey(gameTypeId);
    const queueMembers = await redisClient.hGetAll(queueKey);
    
    // If queue has less than 2 players, nothing to do
    if (Object.keys(queueMembers).length < 2) {
      return;
    }
    
    // Convert to array for easier processing
    const queuedPlayers = Object.entries(queueMembers).map(([userId, dataStr]) => {
      const data = JSON.parse(dataStr);
      return {
        userId,
        elo: data.elo || 1200,
        queuedAt: data.queuedAt,
        gameTypeId
      };
    });
    
    // Sort by time in queue (oldest first)
    queuedPlayers.sort((a, b) => a.queuedAt - b.queuedAt);
    
    // Process each player waiting for a match
    for (let i = 0; i < queuedPlayers.length; i++) {
      const player = queuedPlayers[i];
      
      // Check if player has been in queue too long
      const timeInQueue = Date.now() - player.queuedAt;
      if (timeInQueue > MATCH_TIMEOUT_SECONDS * 1000) {
        // Time out the player
        await redisClient.hDel(queueKey, player.userId);
        await redisClient.del(`matchmaking:timeout:${player.userId}`);
        
        // Notify player about timeout
        const playerSocketId = await redisClient.hGet('users:online', player.userId);
        if (playerSocketId) {
          io.to(playerSocketId).emit('matchmaking-status', {
            status: 'timeout',
            message: 'No suitable match found in time.'
          });
        }
        
        continue; // Skip to next player
      }
      
      // This player has already been matched
      if (await redisClient.exists(`matchmaking:match:${player.userId}`)) {
        continue;
      }
      
      // Calculate starting ELO range based on time in queue
      // The longer in queue, the wider the ELO range
      const timeBasedEloRange = Math.min(
        ELO_RANGE_MAX,
        ELO_RANGE_INITIAL + Math.floor(timeInQueue / 10000) * ELO_RANGE_INCREMENT
      );
      
      // Look for suitable match
      for (let j = 0; j < queuedPlayers.length; j++) {
        if (i === j) continue; // Skip self
        
        const potentialMatch = queuedPlayers[j];
        
        // Skip if already matched
        if (await redisClient.exists(`matchmaking:match:${potentialMatch.userId}`)) {
          continue;
        }
        
        // Check ELO range
        const eloDiff = Math.abs(player.elo - potentialMatch.elo);
        if (eloDiff <= timeBasedEloRange) {
          // We found a match!
          
          // Remove both players from queue
          await redisClient.hDel(queueKey, player.userId);
          await redisClient.hDel(queueKey, potentialMatch.userId);
          
          // Remove timeout keys
          await redisClient.del(`matchmaking:timeout:${player.userId}`);
          await redisClient.del(`matchmaking:timeout:${potentialMatch.userId}`);
          
          // Create a new game with both players
          const { gameId, game } = await createGame(player.userId, potentialMatch.userId, gameTypeId);
          
          // Notify both players
          const player1SocketId = await redisClient.hGet('users:online', player.userId);
          const player2SocketId = await redisClient.hGet('users:online', potentialMatch.userId);
          
          if (player1SocketId) {
            io.to(player1SocketId).emit('matchmaking-status', {
              status: 'matched',
              message: `Match found with player (ELO: ${potentialMatch.elo})`,
              gameId,
              opponent: potentialMatch.userId,
              opponentElo: potentialMatch.elo,
              game
            });
          }
          
          if (player2SocketId) {
            io.to(player2SocketId).emit('matchmaking-status', {
              status: 'matched',
              message: `Match found with player (ELO: ${player.elo})`,
              gameId,
              opponent: player.userId,
              opponentElo: player.elo,
              game
            });
          }
          
          // Log the match
          console.log(`Matched players: ${player.userId} (${player.elo}) & ${potentialMatch.userId} (${potentialMatch.elo}) for ${gameTypeId}`);
          
          break; // Move to next player
        }
      }
    }
  } catch (error) {
    console.error(`Error processing queue for ${gameTypeId}:`, error);
  }
}

// Process the matchmaking queue for all game types
export async function processMatchmakingQueue(io: any) {
  try {
    const gameTypes = getGameTypes();
    
    // Process each game type's queue
    for (const gameType of gameTypes) {
      await processQueueForGameType(gameType.id, io);
    }
  } catch (error) {
    console.error('Error processing matchmaking queue:', error);
  }
}

// Start the queue processor
let queueProcessorInterval: NodeJS.Timeout | null = null;

export function startQueueProcessor(io: any) {
  if (queueProcessorInterval) {
    console.log('Queue processor already running');
    return;
  }
  
  console.log('Starting matchmaking queue processor');
  queueProcessorInterval = setInterval(() => {
    processMatchmakingQueue(io).catch(err => {
      console.error('Error in queue processor interval:', err);
    });
  }, PROCESSOR_INTERVAL_MS);
}

export function stopQueueProcessor() {
  if (queueProcessorInterval) {
    clearInterval(queueProcessorInterval);
    queueProcessorInterval = null;
    console.log('Stopped matchmaking queue processor');
  }
}

export default {
  startQueueProcessor,
  stopQueueProcessor,
  processMatchmakingQueue
};
