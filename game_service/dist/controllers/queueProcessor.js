import { redisClient, createGame } from '../lib/redis.js';
import { getGameTypes } from './matchmaking.js';
const MATCH_TIMEOUT_SECONDS = 120; // 2 minutes
const ELO_RANGE_INITIAL = 100;
const ELO_RANGE_INCREMENT = 50;
const ELO_RANGE_MAX = 400;
const PROCESSOR_INTERVAL_MS = 5000; // 5 seconds
function getQueueKey(gameTypeId) {
    return `matchmaking:queue:${gameTypeId}`;
}
async function processQueueForGameType(gameTypeId, io) {
    try {
        const queueKey = getQueueKey(gameTypeId);
        const queueMembers = await redisClient.hGetAll(queueKey);
        if (Object.keys(queueMembers).length < 2) {
            return;
        }
        const queuedPlayers = Object.entries(queueMembers).map(([userId, dataStr]) => {
            const data = JSON.parse(dataStr);
            return {
                userId,
                elo: data.elo || 1200,
                queuedAt: data.queuedAt,
                gameTypeId
            };
        });
        console.log(`[${new Date().toISOString()}] Queue ${gameTypeId} players: ${queuedPlayers.map(p => `${p.userId}(${p.elo})`).join(', ')}`);
        queuedPlayers.sort((a, b) => a.queuedAt - b.queuedAt);
        for (let i = 0; i < queuedPlayers.length; i++) {
            const player = queuedPlayers[i];
            const timeInQueue = Date.now() - player.queuedAt;
            if (timeInQueue > MATCH_TIMEOUT_SECONDS * 1000) {
                console.log(`[${new Date().toISOString()}] Timeout for player ${player.userId} in queue ${gameTypeId}. Time in queue: ${timeInQueue / 1000}s`);
                await redisClient.hDel(queueKey, player.userId);
                await redisClient.del(`matchmaking:timeout:${player.userId}`);
                const playerSocketId = await redisClient.hGet('users:online', player.userId);
                if (playerSocketId) {
                    io.to(playerSocketId).emit('matchmaking-status', {
                        success: false,
                        message: 'No suitable match found in time.'
                    });
                    console.log(`[${new Date().toISOString()}] Sent timeout notification to player ${player.userId}`);
                }
                continue;
            }
            if (await redisClient.exists(`matchmaking:match:${player.userId}`)) {
                continue;
            }
            const timeBasedEloRange = Math.min(ELO_RANGE_MAX, ELO_RANGE_INITIAL + Math.floor(timeInQueue / 10000) * ELO_RANGE_INCREMENT);
            console.log(`[${new Date().toISOString()}] Player ${player.userId} (${player.elo}) has been in queue for ${timeInQueue / 1000}s. Using ELO range: ${timeBasedEloRange}`);
            for (let j = 0; j < queuedPlayers.length; j++) {
                if (i === j)
                    continue;
                const potentialMatch = queuedPlayers[j];
                if (await redisClient.exists(`matchmaking:match:${potentialMatch.userId}`)) {
                    console.log(`[${new Date().toISOString()}] Player ${potentialMatch.userId} already matched. Skipping.`);
                    continue;
                }
                const eloDiff = Math.abs(player.elo - potentialMatch.elo);
                console.log(`[${new Date().toISOString()}] Comparing ${player.userId}(${player.elo}) with ${potentialMatch.userId}(${potentialMatch.elo}). ELO diff: ${eloDiff}, Max allowed: ${timeBasedEloRange}`);
                if (eloDiff <= timeBasedEloRange) {
                    await redisClient.hDel(queueKey, player.userId);
                    await redisClient.hDel(queueKey, potentialMatch.userId);
                    await redisClient.del(`matchmaking:timeout:${player.userId}`);
                    await redisClient.del(`matchmaking:timeout:${potentialMatch.userId}`);
                    console.log(`[${new Date().toISOString()}] MATCH FOUND: Creating game for ${player.userId} and ${potentialMatch.userId} for game type ${gameTypeId}`);
                    const { gameId, game } = await createGame(player.userId, potentialMatch.userId, gameTypeId);
                    console.log(`[${new Date().toISOString()}] Game created with ID: ${gameId}`);
                    const player1SocketId = await redisClient.hGet('users:online', player.userId);
                    const player2SocketId = await redisClient.hGet('users:online', potentialMatch.userId);
                    if (player1SocketId) {
                        console.log(`[${new Date().toISOString()}] Notifying player ${player.userId} (socket ${player1SocketId}) about match`);
                        io.to(player1SocketId).emit('matchmaking-status', {
                            success: true,
                            message: `Match found with player (ELO: ${potentialMatch.elo})`,
                            gameId,
                            opponent: potentialMatch.userId,
                            opponentElo: potentialMatch.elo,
                            game
                        });
                    }
                    else {
                        console.log(`[${new Date().toISOString()}] WARNING: Player ${player.userId} socket not found!`);
                    }
                    if (player2SocketId) {
                        console.log(`[${new Date().toISOString()}] Notifying player ${potentialMatch.userId} (socket ${player2SocketId}) about match`);
                        io.to(player2SocketId).emit('matchmaking-status', {
                            success: true,
                            message: `Match found with player (ELO: ${player.elo})`,
                            gameId,
                            opponent: player.userId,
                            opponentElo: player.elo,
                            game
                        });
                    }
                    else {
                        console.log(`[${new Date().toISOString()}] WARNING: Player ${potentialMatch.userId} socket not found!`);
                    }
                    console.log(`[${new Date().toISOString()}] MATCH COMPLETE: ${player.userId} (${player.elo}) & ${potentialMatch.userId} (${potentialMatch.elo}) for ${gameTypeId} in game ${gameId}`);
                    break; // Move to next player
                }
            }
        }
    }
    catch (error) {
        console.error(`Error processing queue for ${gameTypeId}:`, error);
    }
}
// Process the matchmaking queue for all game types
export async function processMatchmakingQueue(io) {
    try {
        const gameTypes = getGameTypes();
        // Process each game type's queue
        for (const gameType of gameTypes) {
            await processQueueForGameType(gameType.id, io);
        }
    }
    catch (error) {
        console.error('Error processing matchmaking queue:', error);
    }
}
// Start the queue processor
let queueProcessorInterval = null;
export function startQueueProcessor(io) {
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
