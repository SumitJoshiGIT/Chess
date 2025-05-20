import { redisClient } from '../lib/redis.js';
import { Chess } from 'chess.js';
// Check if a move requires promotion
export async function checkPromotion(gameId, moveData) {
    try {
        // Get current game state
        const gameStateStr = await redisClient.get(`game:${gameId}:state`);
        if (!gameStateStr) {
            throw new Error('Game not found');
        }
        const gameState = JSON.parse(gameStateStr);
        // Convert numeric positions to algebraic notation
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
        const startSquare = `${files[moveData.startX]}${ranks[moveData.startY]}`;
        const endSquare = `${files[moveData.endX]}${ranks[moveData.endY]}`;
        // Set up chess.js with the current FEN
        const chess = new Chess(gameState.board);
        // Check if this is a pawn
        const piece = chess.get(startSquare);
        if (!piece || piece.type !== 'p') {
            return { needsPromotion: false };
        }
        // Check if it's moving to the promotion rank
        const isWhitePawnToLastRank = piece.color === 'w' && ranks[moveData.endY] === '8';
        const isBlackPawnToLastRank = piece.color === 'b' && ranks[moveData.endY] === '1';
        if (isWhitePawnToLastRank || isBlackPawnToLastRank) {
            // Check if the move is legal
            const possibleMove = chess.moves({
                verbose: true,
                square: startSquare
            }).find((m) => m.to === endSquare);
            if (possibleMove) {
                return {
                    needsPromotion: true,
                    from: startSquare,
                    to: endSquare,
                    color: piece.color === 'w' ? 'white' : 'black'
                };
            }
        }
        return { needsPromotion: false };
    }
    catch (error) {
        console.error('Error checking promotion:', error);
        throw error;
    }
}
export default {
    checkPromotion
};
