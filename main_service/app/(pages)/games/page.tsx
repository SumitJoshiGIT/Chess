"use client";
import { useState, useEffect, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import PlayerCard from "@/components/custom/PlayerCard"
import MoveHistory from "@/components/custom/MoveHistory";
export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [turn, setTurn] = useState("w"); // 'w' = White, 'b' = Black
  const [clocks, setClocks] = useState({ w: 300, b: 300 }); // 5 min per player
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setClocks((prev) => {
        const newClocks = { ...prev };
        newClocks[turn] = Math.max(newClocks[turn] - 1, 0);
        return newClocks;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current!);
  }, [turn]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Handle piece movement
  const onPieceDrop = (sourceSquare: string, targetSquare: string) => {
    const newGame = new Chess(game.fen());
    const move = newGame.move({ from: sourceSquare, to: targetSquare });
    if (move) {
      setGame(newGame);
      setMoveHistory([...moveHistory, move.san]);
      setTurn(newGame.turn());

      return true; // Valid move
    }
    return false; // Invalid move
  };

  // Reset game
  const resetGame = () => {
    setGame(new Chess());
    setMoveHistory([]);
    setTurn("w");
    setClocks({ w: 300, b: 300 });
  };

  // Undo last move
  const undoMove = () => {
    const newGame = new Chess(game.fen());
    newGame.undo();
    setGame(newGame);
    setMoveHistory(moveHistory.slice(0, -1));
    setTurn(newGame.turn());
  };

  return (
    <div className="flex box-border items-center justify-center  w-full h-full flex-wrap  ">
      <div className="flex-col max-w-xl justify-center min-w-sm items-center w-full h-full p-2">
        
       <PlayerCard elo={1500} name="Gold"  />

        <Card className="w-full h-full min-w-sm min-h-sm ">
            <CardContent className="p-2 box-border w-full h-full">
              <Chessboard position={game.fen()} onPieceDrop={onPieceDrop} />
            </CardContent>
        </Card>
        
        <PlayerCard elo={1500} name="Gold"  />
       </div>
         <MoveHistory moveHistory={moveHistory} />
       </div>
  );
}