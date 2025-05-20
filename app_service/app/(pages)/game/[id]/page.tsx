"use client";

import { useEffect } from "react";
import Game from "@/components/custom/ChessGame";
import { useSocket } from "@/components/custom/Socket";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

interface GamePageProps {
  params: {
    id: string;
  };
}

export default function GamePage({ params }: GamePageProps) {
  const { id: gameId } = params;
  const router = useRouter();
  const { isConnected, connect, gameState, error } = useSocket();
  const { toast } = useToast();

  // Connect to socket if not already connected
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    
    if (!isConnected && userId) {
      connect(userId);
    }
  }, [isConnected, connect]);

  // Handle connection errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Connection Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Game #{gameId}</h1>
        <Button variant="outline" onClick={() => router.push('/games')}>
          Back to Games
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {!isConnected ? (
          <div className="p-8 text-center">
            <p className="mb-4">Connecting to game server...</p>
          </div>
        ) : (
          <Game gameID={gameId} />
        )}
      </div>
    </div>
  );
}