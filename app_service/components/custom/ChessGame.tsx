"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PlayerCard from "@/components/custom/PlayerCard";
import MoveHistory from "@/components/custom/MoveHistory";
import PromotionDialog from "@/components/custom/PromotionDialog";
import { useSocket, MoveData } from "@/components/custom/Socket";
import { useToast } from "@/components/ui/use-toast";
import { usePlayerProfile } from "@/hooks/use-player-profile";

interface PlayerProfile {
  name: string;
  elo: number;
}

interface ChessGameProps {
  gameID: string;
}

export default function ChessGame({ gameID }: ChessGameProps) {
  console.log('[ChessGame] Rendered with gameID:', gameID);
  const {
    socket,
    isConnected,
    gameState,
    makeMove,
    resignGame,
    offerDraw,
    acceptDraw,
    joinGame,
    error
  } = useSocket();

  const { toast } = useToast();
  const [game, setGame] = useState(new Chess());
  const [userColor, setUserColor] = useState<'white' | 'black' | null>(null);
  const whitePlayerProfile = usePlayerProfile(gameState?.players?.white);
  const blackPlayerProfile = usePlayerProfile(gameState?.players?.black);
  const [whiteTime, setWhiteTime] = useState(600); // 10 minutes default
  const [blackTime, setBlackTime] = useState(600);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [showDrawOffer, setShowDrawOffer] = useState<boolean>(false);
  const [customSquareStyles, setCustomSquareStyles] = useState<Record<string, React.CSSProperties>>({});
  const [showPromotion, setShowPromotion] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    sourceSquare: string;
    targetSquare: string;
  } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const uid = localStorage.getItem('userId');
    setCurrentUserId(uid);
    console.log('[ChessGame] useEffect: Set currentUserId:', uid);
  }, []);
  
  useEffect(() => {
    console.log('[ChessGame] useEffect: isConnected:', isConnected, 'gameID:', gameID);
    if (isConnected && gameID) {
      console.log(`[ChessGame] Calling joinGame(${gameID})`);
      joinGame(gameID);    
      localStorage.removeItem('chess_matchmaking_status');
      localStorage.setItem('chess_game_in_progress', 'true');
      localStorage.setItem('chess_current_game_id', gameID);
      console.log(`[ChessGame] Mounted for game ${gameID}, cleared matchmaking status`);
    }
  }, [isConnected, gameID, joinGame]);
  
  useEffect(() => {
    console.log('[ChessGame] useEffect: gameState changed:', gameState);
    if (gameState) {
      // ... drawOffer and userColor/boardOrientation logic ...
      if (gameState.drawOffer) {
        const userId = localStorage.getItem('userId');
        if (userId && gameState.drawOffer.by !== userId) {
          setShowDrawOffer(true);
          toast({
            title: "Draw Offered",
            description: "Your opponent has offered a draw",
          });
          console.log('[ChessGame] Draw offer received:', gameState.drawOffer);
        }
      } else {
        setShowDrawOffer(false);
      }
      
      if (currentUserId) {
        if (gameState.players.white === currentUserId) {
          setUserColor('white');
          setBoardOrientation('white');
          console.log('[ChessGame] You are white');
        } else if (gameState.players.black === currentUserId) {
          setUserColor('black');
          setBoardOrientation('black');
          console.log('[ChessGame] You are black');
        }
      }
      // End of drawOffer and userColor/boardOrientation logic
      
      let newGameInstance: Chess | null = null;
      let fenToLoad: string | undefined = undefined;
      if (gameState.fen && typeof gameState.fen === 'string') {
        fenToLoad = gameState.fen;
        console.log('[ChessGame] Prioritizing gameState.fen:', fenToLoad);
      } else if (gameState.board && typeof gameState.board === 'string') {
        fenToLoad = gameState.board;
        console.log('[ChessGame] Using gameState.board as FEN:', fenToLoad);
      } else if (gameState.fen || gameState.board) {
        console.warn('[ChessGame] gameState.fen or gameState.board present but not string:', gameState.fen, gameState.board);
      }
      if (fenToLoad) {
        try {
          newGameInstance = new Chess(fenToLoad);
          console.log('[ChessGame] FEN loaded successfully:', fenToLoad);
        } catch (e) {
          console.error('[ChessGame] Error loading FEN:', fenToLoad, e);
          newGameInstance = null;
        }
      }
      if (!newGameInstance && gameState.pgn) {
        try {
          const pgnToLoad = gameState.pgn;
          if (typeof pgnToLoad !== 'string') throw new Error('PGN is not a string');
          const trimmedPgn = pgnToLoad.trim();
          if (trimmedPgn === '' || trimmedPgn === '*') {
            if (!fenToLoad) newGameInstance = new Chess();
          } else {
            const tempGame = new Chess();
            tempGame.loadPgn(trimmedPgn);
            newGameInstance = tempGame;
            console.log('[ChessGame] PGN loaded successfully:', trimmedPgn);
          }
        } catch (e) {
          console.error('[ChessGame] Error loading PGN:', gameState.pgn, e);
          if (!fenToLoad) newGameInstance = null;
        }
      }
      if (!newGameInstance && gameState.moves && gameState.moves.length > 0) {
        try {
          const tempGame = new Chess();
          gameState.moves.forEach(move => {
            if (move.san) {
              const result = tempGame.move(move.san);
              if (!result) console.warn('[ChessGame] Failed to apply SAN move:', move.san, tempGame.fen());
            } else {
              console.warn('[ChessGame] Move in history lacks SAN:', move);
            }
          });
          newGameInstance = tempGame;
          console.log('[ChessGame] Moves replayed successfully.');
        } catch (e) {
          console.error('[ChessGame] Error replaying moves:', e);
        }
      }
      if (newGameInstance) {
        if (newGameInstance.fen() !== game.fen()) {
          console.log('[ChessGame] Setting new game state from newGameInstance. New FEN:', newGameInstance.fen());
          setGame(newGameInstance);
        } else {
          console.log('[ChessGame] newGameInstance FEN is same as current game FEN. No update.');
        }
      } else if (gameState) {
        const initialFen = new Chess().fen();
        if (game.fen() !== initialFen) {
          console.warn('[ChessGame] Failed to initialize game from gameState, resetting to new Chess instance.');
          setGame(new Chess());
        } else {
          console.log('[ChessGame] Already in initial state. No update.');
        }
      }
      
      // Update last move highlights
      if (gameState.moves && gameState.moves.length > 0) {
        const lastMoveData = gameState.moves[gameState.moves.length - 1];
        if (lastMoveData && lastMoveData.from && lastMoveData.from.square && lastMoveData.to && lastMoveData.to.square) {
          setCustomSquareStyles({
            [lastMoveData.from.square]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
            [lastMoveData.to.square]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
          });
          console.log('[ChessGame] Highlighting last move:', lastMoveData.from.square, lastMoveData.to.square);
        } else {
          setCustomSquareStyles({});
        }
      } else {
        setCustomSquareStyles({});
      }
      
      if (gameState.timeControl) {
        setWhiteTime(Math.max(0, gameState.timeControl.white));
        setBlackTime(Math.max(0, gameState.timeControl.black));
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (gameState.status === 'active') {
          const lastMoveTimestamp = new Date(gameState.timeControl.lastMoveTime).getTime();
          const clientTimeWhenStateReceived = new Date().getTime();
          const secondsElapsedSinceServerUpdate = Math.floor((clientTimeWhenStateReceived - lastMoveTimestamp) / 1000);
          let initialWhite = gameState.timeControl.white;
          let initialBlack = gameState.timeControl.black;
          if (gameState.turn === 'w') {
            initialWhite = Math.max(0, initialWhite - secondsElapsedSinceServerUpdate);
          } else {
            initialBlack = Math.max(0, initialBlack - secondsElapsedSinceServerUpdate);
          }
          setWhiteTime(initialWhite);
          setBlackTime(initialBlack);
          if (initialWhite > 0 && initialBlack > 0) {
            timerRef.current = setInterval(() => {
              if (gameState.turn === 'w') {
                setWhiteTime(prev => {
                  if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    return 0;
                  }
                  return prev - 1;
                });
              } else {
                setBlackTime(prev => {
                  if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    return 0;
                  }
                  return prev - 1;
                });
              }
            }, 1000);
            console.log('[ChessGame] Timer started. White:', initialWhite, 'Black:', initialBlack);
          }
        } else {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          console.log('[ChessGame] Timer stopped. Game status:', gameState.status);
        }
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState, currentUserId, toast]);
  
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60 * 100) / 100;
    return `${mins}:${secs < 10 ? '0' : ''}${secs.toFixed(2)}`;
  }, []);

  const onDrop = useCallback((sourceSquare: string, targetSquare: string, piece: string) => {
    console.log('[ChessGame] onDrop:', { sourceSquare, targetSquare, piece, gameState, userColor });
    if (!gameState || gameState.status !== 'active') return false;
    const fen = gameState?.fen || gameState?.board || game.fen();
    const currentGame = new Chess(fen);
    const isWhiteTurn = currentGame.turn() === 'w';
    if ((isWhiteTurn && userColor !== 'white') || (!isWhiteTurn && userColor !== 'black')) {
      toast({
        title: "Not your turn",
        description: "Please wait for your opponent to move",
        variant: "destructive"
      });
      console.warn('[ChessGame] Not your turn:', { isWhiteTurn, userColor });
      return false;
    }
    const moveAttempt = currentGame.move({ from: sourceSquare, to: targetSquare });
    if (!moveAttempt) {
      toast({
        title: "Invalid Move",
        description: "The attempted move is not legal.",
        variant: "destructive"
      });
      console.warn('[ChessGame] Invalid move attempt:', { sourceSquare, targetSquare });
      return false;
    }
    const isPawnPromotion = moveAttempt.flags.includes('p');
    if (isPawnPromotion) {
      setPendingMove({ sourceSquare, targetSquare });
      setShowPromotion(true);
      console.log('[ChessGame] Pawn promotion detected:', { sourceSquare, targetSquare });
      return false;
    }
    makeMove(gameID, { pgnMove: moveAttempt.san });
    setCustomSquareStyles({
      [sourceSquare]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
      [targetSquare]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
    });
    console.log('[ChessGame] Move sent to server:', moveAttempt.san);
    return true;
  }, [gameState, userColor, toast, makeMove, gameID, setCustomSquareStyles, setPendingMove, setShowPromotion]);

  // Memoize game completion checks
  const isGameOver = useMemo(() => gameState && ['checkmate', 'drawn', 'resigned', 'timeout'].includes(gameState.status), [gameState]);

  // Memoize player display names
  const playerDisplays = useMemo(() => ({
    white: {
      name: whitePlayerProfile?.name || 
            (gameState?.players.white && gameState.players.white === currentUserId ? "You" : 
            (gameState?.players.white ? `P ${gameState.players.white.substring(0,4)}` : "White")),
      elo: whitePlayerProfile?.elo || 1200
    },
    black: {
      name: blackPlayerProfile?.name || 
            (gameState?.players.black && gameState.players.black === currentUserId ? "You" : 
            (gameState?.players.black ? `P ${gameState.players.black.substring(0,4)}` : "Black")),
      elo: blackPlayerProfile?.elo || 1200
    }
  }), [whitePlayerProfile, blackPlayerProfile, gameState?.players, currentUserId]);

  // Use FEN/board as the only dependency for game instance
  const fen = gameState?.fen || gameState?.board;

  const gameInstance = useMemo(() => {
    if (!fen) return game;
    try {
      return new Chess(fen);
    } catch (e) {
      console.error("Failed to create game from FEN:", e);
      return game;
    }
  }, [fen, game]);

  // Sync the local game state with the memoized instance
  useEffect(() => {
    if (!fen) return;
    if (gameInstance.fen() !== game.fen()) {
      setGame(gameInstance);
    }
  }, [gameInstance, game, fen]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full p-2 md:p-4">
      <div className="flex-1">
        <div className="flex flex-col md:flex-row md:justify-between gap-2 mb-4">
          <PlayerCard 
            name={boardOrientation === 'white' ? playerDisplays.black.name : playerDisplays.white.name} 
            elo={boardOrientation === 'white' ? playerDisplays.black.elo : playerDisplays.white.elo} 
            time={formatTime(boardOrientation === 'white' ? blackTime : whiteTime)}
            isActive={gameState?.turn === (boardOrientation === 'white' ? 'b' : 'w')}
          />
          
          <div className="flex flex-wrap gap-2 justify-center md:justify-end">
            {showDrawOffer && (
              <div className="flex gap-2 items-center bg-yellow-50 p-2 rounded-md border border-yellow-200">
                <span className="text-sm">Draw offered</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    acceptDraw(gameID);
                    setShowDrawOffer(false);
                  }}
                >
                  Accept
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowDrawOffer(false)}
                >
                  Decline
                </Button>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => resignGame(gameID)}
              disabled={!!(!gameState || isGameOver)}
            >
              Resign
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => offerDraw(gameID)}
              disabled={!!(!gameState || isGameOver || showDrawOffer)}
            >
              Offer Draw
            </Button>
          </div>
        </div>
        
        {/* Chess Board */}
        <div className="aspect-square">
          <Card>
            <CardContent className="p-2">
              <Chessboard 
                position={gameState?.fen || gameState?.board || game.fen()}
                onPieceDrop={onDrop}
                boardOrientation={boardOrientation}
                customBoardStyle={{
                  borderRadius: '4px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                }}
                areArrowsAllowed={true}
                customSquareStyles={customSquareStyles}
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between mt-4 gap-2">
          <PlayerCard 
            name={boardOrientation === 'white' ? playerDisplays.white.name : playerDisplays.black.name} 
            elo={boardOrientation === 'white' ? playerDisplays.white.elo : playerDisplays.black.elo} 
            time={formatTime(boardOrientation === 'white' ? whiteTime : blackTime)}
            isActive={gameState?.turn === (boardOrientation === 'white' ? 'w' : 'b')}
          />
          
          {isGameOver && (
            <div className="bg-gray-100 p-2 rounded-md text-center">
              <p className="font-semibold">Game Over: {gameState?.status}</p>
              {gameState?.winner && <p>Winner: {gameState.winner}</p>}
            </div>
          )}
        </div>
      </div>
      
      <div className="md:w-64 flex flex-col gap-4 mt-4 lg:mt-0">
        <div className="border rounded-md p-4 bg-white shadow-sm">
          <h3 className="font-semibold mb-2">Game Info</h3>
          <p>ID: {gameID}</p>
          <p>Status: {gameState?.status || "Loading..."}</p>
          <p>Time Control: {gameState?.timeControl?.increment ? `${Math.floor((gameState.timeControl.white || 600)/60)}+${gameState.timeControl.increment}` : "Unknown"}</p>
        </div>
        
        <div className="border rounded-md p-4 bg-white shadow-sm flex-1 overflow-auto">
          <h3 className="font-semibold mb-2">Move History</h3>
          {gameState?.moves ? (
            <MoveHistory moves={gameState.moves} />
          ) : (
            <p className="text-gray-500">No moves yet</p>
          )}
        </div>
      </div>
      
      {/* Promotion dialog */}
      <PromotionDialog 
        isOpen={showPromotion}
        playerColor={userColor || 'white'}
        onSelect={(promotionPiece) => {
          console.log('[PromotionDialog] Promotion selected:', promotionPiece, 'Pending move:', pendingMove);
          if (pendingMove && pendingMove.sourceSquare && pendingMove.targetSquare) {
            const tempGame = new Chess(game.fen());
            const promotionMoveAttempt = tempGame.move({
              from: pendingMove.sourceSquare,
              to: pendingMove.targetSquare,
              promotion: promotionPiece.toLowerCase()
            });
            console.log('[PromotionDialog] Promotion move attempt:', promotionMoveAttempt, 'SAN:', promotionMoveAttempt?.san);
            if (promotionMoveAttempt) {
              console.log('[PromotionDialog] Calling makeMove with SAN:', promotionMoveAttempt.san, 'for gameID:', gameID);
              makeMove(gameID, {
                pgnMove: promotionMoveAttempt.san,
              });
              setCustomSquareStyles({
                [pendingMove.sourceSquare]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
                [pendingMove.targetSquare]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
              });
            } else {
              console.error('[PromotionDialog] Promotion error: Could not apply the promotion.', {
                pendingMove,
                promotionPiece,
                fen: game.fen(),
              });
              toast({
                title: "Promotion Error",
                description: "Could not apply the promotion.",
                variant: "destructive"
              });
            }
            setPendingMove(null);
          } else {
            console.warn('[PromotionDialog] No pending move when promotion selected:', promotionPiece, pendingMove);
          }
          setShowPromotion(false);
        }}
        onClose={() => {
          setPendingMove(null);
          setShowPromotion(false);
        }}
      />
    </div>
  );
}
