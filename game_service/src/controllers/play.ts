import { makeMove, getGame, updateGame, checkGameTimeout } from '../lib/redis.js';

// Validate if a move is legal in chess (simplified validation)
function isValidChessMove(move: string, gameState: any): boolean {
  // This is a very simplified validation
  // In a real app, you'd use a chess engine library to validate moves
  // For PGN, you might want to use a library like chess.js to validate the move against the current game state
  // For now, we'll assume the client sends a valid PGN string
  return typeof move === 'string' && move.length > 1;
}

// Make a move in a game
export async function executeMove(gameId: string, userId: string, moveData: {
  pgnMove: string, // Changed from coordinates to PGN string
  promotion?: string
}) {
  try {
    // First check if the game has timed out before allowing the move
    await checkGameTimeout(gameId);
    
    // Use the Redis function to make the move
    // The makeMove function in redis.js has been updated to accept pgnMove and promotion
    const updatedGameState = await makeMove(gameId, userId, moveData.pgnMove, moveData.promotion);
    
    return updatedGameState;
  } catch (error) {
    console.error(`Error executing move:`, error);
    throw error;
  }
}

// Resign from a game
export async function resignGame(gameId: string, userId: string) {
  try {
    // Get current game state
    const gameState = await getGame(gameId);
    
    if (!gameState) {
      throw new Error('Game not found');
    }
    
    // Find player's color
    const playerColor = Object.entries(gameState.players).find(
      ([_, id]) => id === userId
    )?.[0];
    
    if (!playerColor) {
      throw new Error('You are not a player in this game');
    }
    
    // Update game status
    gameState.status = 'resigned';
    gameState.winner = playerColor === 'white' ? 'black' : 'white';
    gameState.endReason = 'resignation';
    
    // Save updated state
    await updateGame(gameId, gameState);
    
    return gameState;
  } catch (error) {
    console.error(`Error resigning game:`, error);
    throw error;
  }
}

// Offer a draw
export async function offerDraw(gameId: string, userId: string) {
  try {
    // Get current game state
    const gameState = await getGame(gameId);
    
    if (!gameState) {
      throw new Error('Game not found');
    }
    
    // Find player's color
    const playerColor = Object.entries(gameState.players).find(
      ([_, id]) => id === userId
    )?.[0];
    
    if (!playerColor) {
      throw new Error('You are not a player in this game');
    }
    
    // Record draw offer in game state
    gameState.drawOffer = {
      by: userId,
      color: playerColor,
      timestamp: new Date().toISOString()
    };
    
    // Save updated state
    await updateGame(gameId, gameState);
    
    return gameState;
  } catch (error) {
    console.error(`Error offering draw:`, error);
    throw error;
  }
}

// Accept a draw offer
export async function acceptDraw(gameId: string, userId: string) {
  try {
    // Get current game state
    const gameState = await getGame(gameId);
    
    if (!gameState) {
      throw new Error('Game not found');
    }
    
    // Check if there's a draw offer
    if (!gameState.drawOffer) {
      throw new Error('No draw has been offered');
    }
    
    // Find player's color
    const playerColor = Object.entries(gameState.players).find(
      ([_, id]) => id === userId
    )?.[0];
    
    if (!playerColor) {
      throw new Error('You are not a player in this game');
    }
    
    // Check if the draw was offered by the opponent
    if (gameState.drawOffer.by === userId) {
      throw new Error('You cannot accept your own draw offer');
    }
    
    // Update game status
    gameState.status = 'drawn';
    gameState.endReason = 'agreement';
    delete gameState.drawOffer; // Remove the draw offer
    
    // Save updated state
    await updateGame(gameId, gameState);
    
    return gameState;
  } catch (error) {
    console.error(`Error accepting draw:`, error);
    throw error;
  }
}

export default {
  executeMove,
  resignGame,
  offerDraw,
  acceptDraw
};