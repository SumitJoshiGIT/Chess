"use client";

import { io, Socket } from 'socket.io-client';
import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';

// Game types that match the server implementation
export interface GameType {
  id: string;
  name: string;
  timeControl: string;
  description: string;
  duration: number; // Duration in seconds
  increment: number; // Increment in seconds
  expiration: number; // How long to keep game in Redis (in seconds)
}

// Game events and responses
export interface MatchmakingResponse {
  success: boolean;
  message: string;
  queueId?: string;
  position?: number;
  estimatedTime?: number;
}

export interface GameState {
  gameId: string;
  status: 'waiting' | 'active' | 'checkmate' | 'drawn' | 'resigned' | 'timeout';
  players: {
    white: string;
    black: string;
  };
  fen?: string; // Current FEN of the game
  pgn?: string; // Full PGN of the game
  board?: any; // This can be removed if FEN is always present
  moves?: { san: string; from?: { square: string }; to?: { square: string }; promotion?: string }[]; // Updated to reflect actual move data structure
  turn?: 'w' | 'b';
  winner?: string;
  endReason?: string;
  drawOffer?: {
    by: string;
    color: string;
    timestamp: string;
  };
  timeControl: {
    white: number; // Time left in seconds
    black: number;
    increment: number;
    lastMoveTime: string;
  };
}

export interface MoveData {
  pgnMove: string; // Changed from coordinate structure to PGN string
  promotion?: string; // For pawn promotion, e.g., 'q'
}

// Socket context to provide socket throughout the app
interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connect: (userId: string, elo?: number) => void;
  disconnect: () => void;
  findMatch: (gameTypeId: string) => void;
  createDirectGame: (gameTypeId: string) => void;
  cancelMatchmaking: () => void;
  makeMove: (gameId: string, move: MoveData) => void;
  joinGame: (gameId: string) => void;
  resignGame: (gameId: string) => void;
  offerDraw: (gameId: string) => void;
  acceptDraw: (gameId: string) => void;
  currentGameId: string | null;
  matchmakingStatus: MatchmakingResponse | null;
  gameState: GameState | null;
  error: string | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
  findMatch: () => {},
  createDirectGame: () => {},
  cancelMatchmaking: () => {},
  makeMove: () => {},
  joinGame: () => {},
  resignGame: () => {},
  offerDraw: () => {},
  acceptDraw: () => {},
  currentGameId: null,
  matchmakingStatus: null,
  gameState: null,
  error: null
});

// Socket provider component
export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [matchmakingStatus, setMatchmakingStatus] = useState<MatchmakingResponse | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Connect to socket.io server
  const connect = useCallback((userId: string, elo: number = 1200) => {
    if (socket) return; // Already connected

    try {
      const serverUrl = process.env.NEXT_PUBLIC_GAME_SERVICE_URL || 'http://localhost:8000';
      
      const newSocket = io(serverUrl, {
        auth: { userId, elo },
        withCredentials: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling'] // Try WebSocket first, fallback to polling
      });

      // Set up event listeners
      newSocket.on('connect', () => {
        console.log('Connected to game service');
        setIsConnected(true);
        setError(null);
      });

      newSocket.on('connect_error', (err) => {
        console.error('Connection error:', err.message);
        setError(`Connection error: ${err.message}`);
      });

      newSocket.on('disconnect', (reason) => {
        console.log(`Disconnected: ${reason}`);
        setIsConnected(false);
        if (reason === 'io server disconnect') {
          // Reconnect manually if server disconnected us
          setTimeout(() => {
            newSocket.connect();
          }, 1000);
        }
      });

      // Game-specific events
      newSocket.on('matchmaking-status', (status: MatchmakingResponse) => {
        console.log('Matchmaking status:', status);
        setMatchmakingStatus(status);
      });

      newSocket.on('game-joined', (data: { gameId: string, gameState: GameState }) => {
        console.log('Game joined:', data);
        setCurrentGameId(data.gameId);
        setGameState(data.gameState);
        setMatchmakingStatus(null); // No longer in matchmaking
      });

      newSocket.on('game-state', (state: GameState) => {
        console.log('[Socket] Received game-state:', state);
        if (state) setGameState(state);
        else console.warn('[Socket] Ignored undefined/null game-state');
      });

      // Updated move-made handler to accept both legacy and new formats
      newSocket.on('move-made', (data: any) => {
        console.log('[Socket] Received move-made:', data);
        // Support both { gameId, move, gameState } and { san, by, color, promotion, check, gameState }
        if (data && data.gameState) setGameState(data.gameState);
        else console.warn('[Socket] Ignored undefined/null move-made gameState');
      });

      newSocket.on('game-over', (data: { gameId: string, result: any, state: GameState }) => {
        console.log('[Socket] Received game-over:', data);
        if (data && data.state) setGameState(data.state);
        else console.warn('[Socket] Ignored undefined/null game-over state');
        // Clear game progress flags
        localStorage.removeItem('chess_game_in_progress');
        localStorage.removeItem('chess_current_game_id');
      });

      newSocket.on('error', (error: string) => {
        console.error('Socket error:', error);
        setError(error);
      });

      setSocket(newSocket);
    } catch (err: any) {
      console.error('Error creating socket:', err);
      setError(`Error creating socket: ${err.message}`);
    }
  }, [socket, setIsConnected, setError, setCurrentGameId, setMatchmakingStatus, setGameState]);

  // Disconnect from socket.io server
  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setCurrentGameId(null);
      setMatchmakingStatus(null);
      setGameState(null);
      // Clear game progress flags
      localStorage.removeItem('chess_game_in_progress');
      localStorage.removeItem('chess_current_game_id');
    }
  }, [socket, setSocket, setIsConnected, setCurrentGameId, setMatchmakingStatus, setGameState]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  // Game service functions
  const findMatch = useCallback((gameTypeId: string) => {
    if (!socket || !isConnected) {
      setError('Not connected to game service');
      return;
    }
    socket.emit('find-match', { gameTypeId });
  }, [socket, isConnected, setError]);

  const createDirectGame = useCallback((gameTypeId: string) => {
    if (!socket || !isConnected) {
      setError('Not connected to game service');
      return;
    }
    socket.emit('create-game', { gameTypeId });
  }, [socket, isConnected, setError]);

  const cancelMatchmaking = useCallback(() => {
    if (!socket || !isConnected) {
      setError('Not connected to game service');
      return;
    }
    
    if (currentGameId) {
      console.log(`Game in progress detected (ID: ${currentGameId}), not cancelling matchmaking`);
      return;
    }
    
    const gameInProgress = localStorage.getItem('chess_game_in_progress') === 'true';
    const savedGameId = localStorage.getItem('chess_current_game_id');
    
    if (gameInProgress || savedGameId) {
      console.log(`Game in progress detected from localStorage (ID: ${savedGameId}), not cancelling matchmaking`);
      return;
    }
    
    if (matchmakingStatus?.success && matchmakingStatus?.message?.includes('Match found')) {
      console.log('Match already found, not cancelling matchmaking');
      return;
    }
    
    socket.emit('cancel-matchmaking');
    setMatchmakingStatus(null);
  }, [socket, isConnected, currentGameId, matchmakingStatus, setError, setMatchmakingStatus]);

  const makeMove = useCallback((
    gameId: string, 
    move: MoveData
  ) => {
    if (!socket || !isConnected) {
      setError('Not connected to game service');
      return;
    }
    console.log('Sending move:', gameId, move);
    socket.emit('make-move', { gameId, ...move });
  }, [socket, isConnected, setError]);

  const joinGame = useCallback((gameId: string) => {
    if (!socket || !isConnected) {
      setError('Not connected to game service');
      return;
    }

    // Prevent joining if already in this game
    if (currentGameId === gameId) {
      console.log('Already in this game, skipping join');
      return;
    }
    
    socket.emit('join-game', { gameId });
    setCurrentGameId(gameId);
    // Set flag in localStorage to track game state across reloads
    localStorage.setItem('chess_game_in_progress', 'true');
    localStorage.setItem('chess_current_game_id', gameId);
  }, [socket, isConnected, currentGameId, setError, setCurrentGameId]);

  const resignGame = useCallback((gameId: string) => {
    if (!socket || !isConnected) {
      setError('Not connected to game service');
      return;
    }
    socket.emit('resign', { gameId });
  }, [socket, isConnected, setError]);

  const offerDraw = useCallback((gameId: string) => {
    if (!socket || !isConnected) {
      setError('Not connected to game service');
      return;
    }
    socket.emit('offer-draw', { gameId });
  }, [socket, isConnected, setError]);

  const acceptDraw = useCallback((gameId: string) => {
    if (!socket || !isConnected) {
      setError('Not connected to game service');
      return;
    }
    socket.emit('accept-draw', { gameId });
  }, [socket, isConnected, setError]);

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      connect,
      disconnect,
      findMatch,
      createDirectGame,
      cancelMatchmaking,
      makeMove,
      joinGame,
      resignGame,
      offerDraw,
      acceptDraw,
      currentGameId,
      matchmakingStatus,
      gameState,
      error
    }}>
      {children}
    </SocketContext.Provider>
  );
}

// Custom hook to use socket throughout the app
export function useSocket() {
  return useContext(SocketContext);
}

// Export a singleton socket for backward compatibility if needed
export const socketSingleton = io(process.env.NEXT_PUBLIC_GAME_SERVICE_URL || 'http://localhost:8000', {
  withCredentials: true,
  autoConnect: false // Don't connect automatically
});