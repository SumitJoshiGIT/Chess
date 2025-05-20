"use client";

import React, { useEffect } from "react";
import ChessGame from "@/components/custom/ChessGame";
import { useSocket } from "@/components/custom/Socket";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import PlayCard from "@/components/custom/PlayCard";

interface GamePageProps {
  params: {
    id: string;
  };
}

export default function GamePage({ params }: GamePageProps) {
  params = React.use(params);
  if (!params || !params.id) {
    return (
      <div className="p-8 text-center text-red-600">
        Invalid game URL. No game ID provided.
      </div>
    );
  }  
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
      <div className="bg-white rounded-lg shadow-md p-6">
        {!isConnected ? (
          <div className="p-8 text-center">
            <p className="mb-4">Connecting to game server...</p>
          </div>
        ) : (
          <ChessGame gameID={gameId} />
        )}
      </div>
    </div>
  );
}