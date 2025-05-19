import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Constants
const NUM_PLAYERS = 20;
const ELO_RANGE = 1000; // 800 to 1800
const GAME_TYPES = ['blitz', 'rapid', 'classical', 'bullet'];
const BASE_ELO = 800;

// Redis client setup
const redisClient = createClient({
  url: REDIS_URL
});

async function simulateMatchmaking() {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');
    
    // Generate random players
    const players = [];
    for (let i = 0; i < NUM_PLAYERS; i++) {
      const playerId = `test_player_${i}`;
      const elo = BASE_ELO + Math.floor(Math.random() * ELO_RANGE);
      const gameTypeId = GAME_TYPES[Math.floor(Math.random() * GAME_TYPES.length)];
      
      players.push({ playerId, elo, gameTypeId });
    }
    
    console.log(`Created ${NUM_PLAYERS} random players with varied ELOs and game types`);
    
    // Queue all players for matchmaking
    for (const player of players) {
      const queueKey = `matchmaking:queue:${player.gameTypeId}`;
      
      // Add user to matchmaking queue with ELO and timestamp
      const userData = {
        elo: player.elo,
        queuedAt: Date.now(),
        gameTypeId: player.gameTypeId
      };
      
      await redisClient.hSet(queueKey, player.playerId, JSON.stringify(userData));
      await redisClient.set(`matchmaking:timeout:${player.playerId}`, player.gameTypeId, { EX: 120 });
      
      console.log(`Queued player ${player.playerId} (ELO: ${player.elo}) for ${player.gameTypeId}`);
    }
    
    console.log('All players have been queued for matchmaking');
    console.log('The matchmaking processor will handle these players automatically');
    console.log('You can check Redis for match results');
    
  } catch (error) {
    console.error('Error in simulation:', error);
  } finally {
    await redisClient.quit();
  }
}

// Run the simulation
simulateMatchmaking().catch(console.error);
