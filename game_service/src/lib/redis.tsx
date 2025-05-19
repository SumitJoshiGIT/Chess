import { createClient } from 'redis';
import { Chess } from 'chess.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Redis client setup
const redisClient = createClient({
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

// Create a game in Redis
export async function createGame(userId: string, opponentId?: string, gameTypeId: string = 'rapid') {
  try {
    // Generate a unique game ID
    const gameId = `game_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Initialize chess.js for proper starting position
    const chess = new Chess();
    
    // Initialize game state with proper FEN
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
      legalMoves: {} // Will store legal moves for each piece
    };
    
    // If opponent is provided, add them as black
    if (opponentId) {
      initialState.players.black = opponentId;
    }
    
    // Save game state
    await redisClient.set(`game:${gameId}:state`, JSON.stringify(initialState));
    await redisClient.sAdd(`game:${gameId}:players`, userId);
    
    // Add opponent if provided
    if (opponentId) {
      await redisClient.sAdd(`game:${gameId}:players`, opponentId);
    }
    
    // Set expiration (24 hours)
    await redisClient.expire(`game:${gameId}:state`, 86400);
    await redisClient.expire(`game:${gameId}:players`, 86400);
    
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

// Get all games from Redis with filtering options
export async function getAllGames(options = {}) {
  try {
    // Get all game IDs
    const gameKeys = await redisClient.keys('game:*:state');
    const gameIds = gameKeys.map((key: string) => key.split(':')[1]);
    
    // Get basic info for each game
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

// Update a game in Redis
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

// Record a move in Redis using start and end positions
export async function makeMove(gameId: string, userId: string, moveData: { 
  startX: number, 
  startY: number, 
  endX: number, 
  endY: number,
  promotion?: string // For pawn promotion: 'q', 'r', 'b', 'n'
}) {
  try {
    // Get current game state
    const gameStateStr = await redisClient.get(`game:${gameId}:state`);
    
    if (!gameStateStr) {
      throw new Error('Game not found');
    }
    
    const gameState = JSON.parse(gameStateStr);
    
    // Find player's color
    const playerColor = Object.entries(gameState.players).find(
      ([_, id]) => id === userId
    )?.[0];
    
    if (!playerColor) {
      throw new Error('You are not a player in this game');
    }
    
    // Check if it's player's turn
    if (gameState.turn !== playerColor) {
      throw new Error('Not your turn');
    }
    
    // Check if game is active
    if (gameState.status !== 'active') {
      throw new Error(`Game is over: ${gameState.status}`);
    }
    
    // Convert numeric positions to algebraic notation
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']; // Note: Chess board is inverted in y-axis (8 at top, 1 at bottom)
    
    const startSquare = `${files[moveData.startX]}${ranks[moveData.startY]}`;
    const endSquare = `${files[moveData.endX]}${ranks[moveData.endY]}`;
    
    // Set up chess.js with the current FEN
    const chess = new Chess(gameState.board);
    
    // Attempt to make the move using chess.js
    try {
      // Create move object for chess.js
      const moveObj: any = {
        from: startSquare as any,
        to: endSquare as any
      };
      
      // Add promotion if provided (and necessary)
      if (moveData.promotion) {
        moveObj.promotion = moveData.promotion;
      } else {
        // Auto-detect if promotion is needed (pawn move to last rank)
        const piece = chess.get(startSquare as any);
        const isPromotionMove = 
          piece && piece.type === 'p' && 
          ((piece.color === 'w' && ranks[moveData.endY] === '8') || 
           (piece.color === 'b' && ranks[moveData.endY] === '1'));
        
        if (isPromotionMove) {
          moveObj.promotion = 'q'; // Default to queen
        }
      }
      
      // Attempt the move
      const move = chess.move(moveObj);
      
      if (!move) {
        throw new Error('Invalid move');
      }
      
      // Update game state with chess.js data
      const moveNotation = `${startSquare}-${endSquare}${moveObj.promotion ? `=${moveObj.promotion.toUpperCase()}` : ''}`;
      
      gameState.moves.push({
        move: moveNotation,
        san: move.san, // Standard Algebraic Notation from chess.js
        from: {
          x: moveData.startX,
          y: moveData.startY,
          square: startSquare
        },
        to: {
          x: moveData.endX,
          y: moveData.endY,
          square: endSquare
        },
        by: userId,
        color: playerColor,
        piece: move.piece,
        captured: move.captured || null,
        promotion: move.promotion || null,
        flags: move.flags, // Special move flags (e.p, capture, promotion, etc)
        timestamp: new Date().toISOString()
      });
      
      // Update board FEN and PGN from chess.js
      gameState.board = chess.fen();
      gameState.pgn = chess.pgn();
      
      // Update game status
      if (chess.isCheckmate()) {
        gameState.status = 'checkmate';
        gameState.winner = playerColor;
        gameState.endReason = 'checkmate';
      } else if (chess.isDraw()) {
        gameState.status = 'drawn';
        if (chess.isStalemate()) {
          gameState.endReason = 'stalemate';
        } else if (chess.isThreefoldRepetition()) {
          gameState.endReason = 'threefold repetition';
        } else if (chess.isInsufficientMaterial()) {
          gameState.endReason = 'insufficient material';
        } else {
          gameState.endReason = '50-move rule';
        }
      } else if (chess.isCheck()) {
        // Game continues, but king is in check
        gameState.check = true;
        gameState.status = 'active';
      } else {
        // Normal move, no check
        gameState.check = false;
        gameState.status = 'active';
      }
      
      // Toggle turn only if game is still active
      if (gameState.status === 'active') {
        gameState.turn = gameState.turn === 'white' ? 'black' : 'white';
        
        // Calculate and store legal moves for the next player
        gameState.legalMoves = calculateLegalMoves(chess);
      } else {
        // Game is over, no more legal moves
        gameState.legalMoves = {};
      }
      
      // Save updated state
      await redisClient.set(`game:${gameId}:state`, JSON.stringify(gameState));
      
      // Set expiration (24 hours)
      await redisClient.expire(`game:${gameId}:state`, 86400);
      await redisClient.expire(`game:${gameId}:players`, 86400);
      
      return gameState;
    } catch (error) {
      console.error(`Chess.js error:`, error);
      throw new Error('Invalid move: ' + (error instanceof Error ? error.message : String(error)));
    }
  } catch (error) {
    console.error(`Error making move:`, error);
    throw error;
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