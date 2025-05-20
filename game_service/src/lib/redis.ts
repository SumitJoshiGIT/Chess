import { createClient } from 'redis';
import { Chess } from 'chess.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Redis client setup
export const redisClient = createClient({
  url: REDIS_URL
});

// Connect to Redis when this module is imported
(async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (error) {
    console.error('Redis connection error:', error);
  }
})();

// Handle Redis connection errors
redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

export async function createGame(userId: string, opponentId?: string, gameTypeId: string = 'rapid') {
  try {
    const gameId = `game_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    console.log(`[${new Date().toISOString()}] Creating game ${gameId} with userId=${userId}, opponentId=${opponentId || 'none'}, gameType=${gameTypeId}`);
    
    const chess = new Chess();
    
    let expirationTime = 86400;
    try {
      const { getGameTypeById } = await import('../controllers/matchmaking.js');
      const gameType = getGameTypeById(gameTypeId);
      if (gameType && gameType.expiration) {
        expirationTime = gameType.expiration;
        console.log(`[${new Date().toISOString()}] Game ${gameId} using expiration time ${expirationTime}s from game type ${gameTypeId}`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error getting game type expiration for ${gameTypeId}:`, error);
    }
    
    const initialState: any = {
      board: chess.fen(), // Get FEN from chess.js instead of hardcoding
      pgn: chess.pgn(),   // Store PGN for move history
      turn: 'white',
      moves: [],
      status: opponentId ? 'active' : 'waiting',
      gameType: gameTypeId,
      createdAt: new Date().toISOString(),
      players: { white: userId },
      check: false,
      legalMoves: {}, 
      timeControl: {
        white: null, 
        black: null,
        lastMoveTime: null
      }
    };
    
    if (opponentId) {
      initialState.players.black = opponentId;
      
      try {
        const { getGameTypeById } = await import('../controllers/matchmaking.js');
        const gameType = getGameTypeById(gameTypeId);
        if (gameType) {
          initialState.timeControl = {
            white: gameType.duration,
            black: gameType.duration,
            increment: gameType.increment,
            lastMoveTime: new Date().toISOString()
          };
          console.log(`[${new Date().toISOString()}] Game ${gameId} time control set: ${gameType.duration}s with ${gameType.increment}s increment`);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error setting up time control for ${gameId}:`, error);
      }
    }
    
    await redisClient.set(`game:${gameId}:state`, JSON.stringify(initialState));
    await redisClient.sAdd(`game:${gameId}:players`, userId);
    
    if (opponentId) {
      await redisClient.sAdd(`game:${gameId}:players`, opponentId);
    }
    await redisClient.expire(`game:${gameId}:state`, expirationTime);
    await redisClient.expire(`game:${gameId}:players`, expirationTime);
    
    console.log(`[${new Date().toISOString()}] Game ${gameId} successfully created and stored in Redis`);
    return { gameId, game: initialState };
  } catch (error) {
    console.error('Error creating game:', error);
    throw new Error('Failed to create game');
  }
}

// Get a game from Redis
export async function getGame(gameId: string) {
  try {
    const gameStateStr = await redisClient.get(`game:${gameId}:state`);
    
    if (!gameStateStr) {
      return null;
    }
    
    return JSON.parse(gameStateStr);
  } catch (error) {
    console.error(`Error fetching game:`, error);
    throw new Error('Failed to fetch game');
  }
}

export async function getAllGames(options = {}) {
  try {
    const gameKeys = await redisClient.keys('game:*:state');
    const gameIds = gameKeys.map((key: string) => key.split(':')[1]);
    const games = [];
    for (const gameId of gameIds) {
      const gameStateStr = await redisClient.get(`game:${gameId}:state`);
      if (gameStateStr) {
        const gameState = JSON.parse(gameStateStr);
        games.push({
          id: gameId,
          status: gameState.status,
          players: gameState.players,
          gameType: gameState.gameType,
          createdAt: gameState.createdAt,
          moves: gameState.moves.length,
          inCheck: gameState.check || false
        });
      }
    }
    
    return games;
  } catch (error) {
    console.error('Error fetching games:', error);
    throw new Error('Failed to fetch games');
  }
}

export async function updateGame(gameId: string, gameState: any) {
  try {
    await redisClient.set(`game:${gameId}:state`, JSON.stringify(gameState));
    return true;
  } catch (error) {
    console.error(`Error updating game:`, error);
    throw new Error('Failed to update game');
  }
}

// Join a game in Redis
export async function joinGame(gameId: string, userId: string) {
  try {
    // Get current game state
    const gameStateStr = await redisClient.get(`game:${gameId}:state`);
    
    if (!gameStateStr) {
      throw new Error('Game not found');
    }
    
    const gameState = JSON.parse(gameStateStr);
    
    // Check if game is joinable
    if (gameState.status !== 'waiting') {
      throw new Error('Game is not joinable');
    }
    
    // Check if player is already in the game
    const players = Object.values(gameState.players);
    if (players.includes(userId)) {
      throw new Error('You are already in this game');
    }
    
    // Add player to the game
    gameState.players.black = userId;
    gameState.status = 'active';
    
    // Save updated state
    await redisClient.set(`game:${gameId}:state`, JSON.stringify(gameState));
    await redisClient.sAdd(`game:${gameId}:players`, userId);
    
    return gameState;
  } catch (error) {
    console.error(`Error joining game:`, error);
    throw error;
  }
}

// Record a move in Redis using PGN (Standard Algebraic Notation)
export async function makeMove(gameId: string, userId: string, pgnMove: string, promotion?: string) {
  try {
    const gameStateStr = await redisClient.get(`game:${gameId}:state`);
    
    if (!gameStateStr) {
      throw new Error('Game not found');
    }    
    const gameState = JSON.parse(gameStateStr);
    const playerColor = Object.entries(gameState.players).find(
      ([_, id]) => id === userId
    )?.[0] as 'white' | 'black' | undefined; // Added type assertion
    
    if (!playerColor) {
      throw new Error('You are not a player in this game');
    }
    
    if (gameState.turn !== playerColor) {
      throw new Error('Not your turn');
    }

    if (gameState.status !== 'active') {
      throw new Error(`Game is over: ${gameState.status}`);
    }
    
    const chess = new Chess(gameState.board);
    
    try {
      // The pgnMove is expected to be in Standard Algebraic Notation (SAN)
      // or a verbose move object { from: 'e2', to: 'e4', promotion: 'q' }
      // For simplicity, we'll assume pgnMove is a SAN string.
      // If it's an object, chess.js handles it. If it's SAN, it also handles it.
      const moveInput: any = promotion ? { from: pgnMove.split('-')[0], to: pgnMove.split('-')[1], promotion: promotion } : pgnMove;
      const move = chess.move(moveInput);
      
      if (!move) {
        // Try to parse if it's a simple coordinate pair like "e2-e4"
        // This is a fallback, ideally the client sends SAN or a full move object
        if (typeof pgnMove === 'string' && pgnMove.includes('-')) {
            const parts = pgnMove.split('-');
            if (parts.length === 2) {
                const attemptMove = chess.move({ from: parts[0], to: parts[1], promotion: promotion });
                if (!attemptMove) {
                    throw new Error('Invalid move format or illegal move');
                }
                // If successful, re-assign move
                // move = attemptMove; // This line is problematic, chess.move was already called
            } else {
                 throw new Error('Invalid move format');
            }
        } else {
            throw new Error('Invalid move');
        }
      }
      
      const currentTime = new Date();
      
      // Update time control if game has time control
      if (gameState.timeControl && gameState.timeControl.lastMoveTime) { // Ensure lastMoveTime is not null
        const currentTimeISO = currentTime.toISOString();
        
        const lastMoveTime = new Date(gameState.timeControl.lastMoveTime);
        const timeElapsed = (currentTime.getTime() - lastMoveTime.getTime()) / 1000; // in seconds
        
        const timeLeft = gameState.timeControl[playerColor] - timeElapsed;
        gameState.timeControl[playerColor] = Math.max(0, timeLeft);
        
        if (gameState.timeControl.increment > 0) {
          gameState.timeControl[playerColor] += gameState.timeControl.increment;
        }
        
        if (gameState.timeControl[playerColor] <= 0) {
          gameState.status = 'timeout';
          gameState.winner = playerColor === 'white' ? 'black' : 'white';
          gameState.endReason = 'timeout';
        }
        
        gameState.timeControl.lastMoveTime = currentTimeISO;
      }
      
      gameState.board = chess.fen(); // Update board FEN
      gameState.pgn = chess.pgn();   // Update PGN
      gameState.turn = chess.turn() === 'w' ? 'white' : 'black'; // Update turn
      
      // Add detailed move object to moves array
      gameState.moves.push({
        move: move.san, // Use SAN from the successful move
        san: move.san, 
        from: { square: move.from }, // chess.js move object has from/to
        to: { square: move.to },     // chess.js move object has from/to
        piece: move.piece,
        color: move.color,
        promotion: move.promotion,
        flags: move.flags,
      });

      // Check for game end conditions
      if (chess.isCheckmate()) {
        gameState.status = 'checkmate';
        gameState.winner = playerColor;
        gameState.endReason = 'checkmate';
      } else if (chess.isDraw()) {
        gameState.status = 'drawn';
        gameState.endReason = chess.isStalemate() ? 'stalemate' : 
                             chess.isThreefoldRepetition() ? 'threefold repetition' :
                             chess.isInsufficientMaterial() ? 'insufficient material' : '50 move rule';
      } else if (chess.isStalemate()) {
        gameState.status = 'drawn';
        gameState.endReason = 'stalemate';
      } else if (chess.isThreefoldRepetition()) {
        gameState.status = 'drawn';
        gameState.endReason = 'threefold repetition';
      } else if (chess.isInsufficientMaterial()) {
        gameState.status = 'drawn';
        gameState.endReason = 'insufficient material';
      }
      
      gameState.check = chess.isCheck(); // Update check status
      
      await redisClient.set(`game:${gameId}:state`, JSON.stringify(gameState));
      
      return gameState;
    } catch (e: any) { // Catch specific chess.js errors or invalid move format
      console.error(`[${new Date().toISOString()}] Error processing move for game ${gameId}:`, e.message);
      throw new Error(`Invalid move: ${e.message}`);
    }
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Error in makeMove for game ${gameId}:`, error.message);
    throw error; // Re-throw original error or a new one
  }
}

// Calculate all legal moves for each piece on the board
function calculateLegalMoves(chess: Chess) {
  const legalMoves: Record<string, string[]> = {};
  
  // Get all squares with pieces
  const board = chess.board();
  for (let rowIndex = 0; rowIndex < 8; rowIndex++) {
    for (let colIndex = 0; colIndex < 8; colIndex++) {
      const piece = board[rowIndex][colIndex];
      if (piece) {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
        const square = `${files[colIndex]}${ranks[rowIndex]}`;
        
        try {
          // Cast square to any to work around chess.js type issues
          const moves = chess.moves({ 
            square: square as any, 
            verbose: true 
          });
          
          if (moves && moves.length > 0) {
            // Extract destination squares from moves
            legalMoves[square] = moves.map((move: any) => move.to);
          }
        } catch (error) {
          console.error(`Error calculating moves for ${square}:`, error);
        }
      }
    }
  }
  
  return legalMoves;
}

// Check if a game has timed out and handle accordingly
export async function checkGameTimeout(gameId: string) {
  try {
    const gameState = await getGame(gameId);
    
    if (!gameState) {
      throw new Error('Game not found');
    }
    
    // If game is already over, no need to check timeout
    if (gameState.status !== 'active') {
      return gameState;
    }
    
    // Check if game has time control
    if (!gameState.timeControl || !gameState.timeControl.lastMoveTime) {
      return gameState;
    }
    
    const currentTime = new Date();
    const lastMoveTime = new Date(gameState.timeControl.lastMoveTime);
    const timeSinceLastMove = (currentTime.getTime() - lastMoveTime.getTime()) / 1000; // in seconds
    
    // Determine whose turn it is and check if they've timed out
    const playerToMove = gameState.turn; // 'white' or 'black'
    const timeRemaining = gameState.timeControl[playerToMove];
    
    if (timeRemaining <= timeSinceLastMove) {
      // Player has timed out, opponent wins
      gameState.status = 'timeout';
      gameState.winner = playerToMove === 'white' ? 'black' : 'white';
      gameState.endReason = 'timeout';
      
      // Save updated state
      await updateGame(gameId, gameState);
      
      // If game is over, save to MongoDB if DB integration is set up
      if (process.env.SAVE_TO_MONGODB === 'true') {
        try {
          await saveGameToMongoDB(gameId, gameState);
        } catch (dbError) {
          console.error('Error saving game to MongoDB:', dbError);
        }
      }
    }
    
    return gameState;
  } catch (error) {
    console.error(`Error checking game timeout:`, error);
    throw error;
  }
}

// Check all active games for timeouts
export async function checkAllGamesForTimeouts() {
  try {
    // Get all active game IDs
    const gameKeys = await redisClient.keys('game:*:state');
    
    // Process each game
    for (const gameKey of gameKeys) {
      try {
        // Extract gameId from the key
        const gameId = gameKey.split(':')[1];
        
        // Get the game state
        const gameStateStr = await redisClient.get(gameKey);
        if (!gameStateStr) continue;
        
        const gameState = JSON.parse(gameStateStr);
        
        // Only check active games with time control
        if (gameState.status !== 'active' || !gameState.timeControl || !gameState.timeControl.lastMoveTime) {
          continue;
        }
        
        // Check for timeout
        const currentTime = new Date();
        const lastMoveTime = new Date(gameState.timeControl.lastMoveTime);
        const timeSinceLastMove = (currentTime.getTime() - lastMoveTime.getTime()) / 1000; // in seconds
        
        // Determine whose turn it is and check if they've timed out
        const playerToMove = gameState.turn; // 'white' or 'black'
        const timeRemaining = gameState.timeControl[playerToMove];
        
        if (timeRemaining <= timeSinceLastMove) {
          // Player has timed out, opponent wins
          gameState.status = 'timeout';
          gameState.winner = playerToMove === 'white' ? 'black' : 'white';
          gameState.endReason = 'timeout';
          
          console.log(`Game ${gameId} ended: ${playerToMove} player timed out. Winner: ${gameState.winner}`);
          
          // Save updated state
          await updateGame(gameId, gameState);
          
          // If game is over, save to MongoDB if DB integration is set up
          if (process.env.SAVE_TO_MONGODB === 'true') {
            try {
              await saveGameToMongoDB(gameId, gameState);
            } catch (dbError) {
              console.error('Error saving game to MongoDB:', dbError);
            }
          }
        }
      } catch (error) {
        console.error(`Error checking game for timeout:`, error);
        // Continue with next game
      }
    }
  } catch (error) {
    console.error('Error checking all games for timeouts:', error);
  }
}

// Save a completed game to MongoDB
async function saveGameToMongoDB(gameId: string, gameState: any) {
  try {
    // Check if MongoDB integration is available
    try {
      // Dynamically import DB client to avoid circular dependencies
      const { saveCompletedGame } = await import('./db.js');
      
      // Only save completed games
      if (!['checkmate', 'drawn', 'resigned', 'timeout'].includes(gameState.status)) {
        return false;
      }
      
      // Create a clean game record for MongoDB
      const gameRecord = {
        gameId,
        status: gameState.status,
        winner: gameState.winner || null,
        endReason: gameState.endReason || null,
        gameType: gameState.gameType,
        players: gameState.players,
        moves: gameState.moves,
        pgn: gameState.pgn,
        createdAt: gameState.createdAt,
        endedAt: new Date().toISOString(),
        timeControl: gameState.timeControl || null
      };
      
      // Save to MongoDB
      await saveCompletedGame(gameRecord);
      
      // After successful save to MongoDB, we could delete from Redis
      // to free up memory, but should keep it for some time for quick access
      // Set a shorter expiration time now that it's in MongoDB
      await redisClient.expire(`game:${gameId}:state`, 3600); // Keep for 1 more hour
      
      return true;
    } catch (error) {
      console.error('MongoDB client not available:', error);
      return false;
    }
  } catch (error) {
    console.error(`Error saving game to MongoDB:`, error);
    return false;
  }
}

// Utility function to save a game to MongoDB after completion
export async function saveCompletedGameToMongoDB(gameId: string) {
  try {
    const gameState = await getGame(gameId);
    
    if (!gameState) {
      throw new Error('Game not found');
    }
    
    // Only save completed games
    if (!['checkmate', 'drawn', 'resigned', 'timeout'].includes(gameState.status)) {
      return false;
    }
    
    return await saveGameToMongoDB(gameId, gameState);
  } catch (error) {
    console.error(`Error saving completed game to MongoDB:`, error);
    return false;
  }
}