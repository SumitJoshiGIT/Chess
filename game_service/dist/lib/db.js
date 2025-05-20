import { PrismaClient } from '@prisma/client';
// Initialize Prisma client
export const prisma = new PrismaClient();
// Helper function to save a completed game
export async function saveCompletedGame(gameData) {
    try {
        // Save the game data using Prisma
        // First extract the relevant data from the Redis game data
        const { gameId, players, status, winner, endReason, gameType, moves, pgn, createdAt } = gameData;
        // Convert players object to the format expected by Prisma
        const player1Id = players.white;
        const player2Id = players.black;
        // Store the basic game record with Prisma
        // Note: We're simplifying the data to match the Prisma schema
        await prisma.game.create({
            data: {
                uid1: player1Id,
                uid2: player2Id,
                // Store move IDs or simplified move data
                moves: moves.map((move, index) => index),
                // Other data as needed
            },
        });
        console.log(`Game ${gameId} saved to database`);
        return true;
    }
    catch (error) {
        console.error('Error saving completed game:', error);
        return false;
    }
}
export default {
    prisma,
    saveCompletedGame
};
