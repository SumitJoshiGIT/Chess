"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/components/custom/Socket";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function GameRedirectPage() {
  const router = useRouter();
  const { isConnected, connect, currentGameId, createDirectGame } = useSocket();
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const { toast } = useToast();
  
  // Connect to socket if not already connected
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    
    if (!isConnected && userId) {
      connect(userId);
    }
  }, [isConnected, connect]);
  
  // Redirect to current game if there is one
  useEffect(() => {
    if (currentGameId) {
      toast({
        title: "Game Active!",
        description: `Redirecting to your active game...`,
        variant: "default"
      });
      router.push(`/games/${currentGameId}`);
    }
  }, [currentGameId, router, toast]);
  
  // Create a new game and then redirect
  const handleCreateGame = () => {
    setIsCreatingGame(true);
    createDirectGame('rapid'); // Using 'rapid' as the default game type
  };
  
  // Redirect to home page
  const handleCancel = () => {
    router.push('/');
  };
  
  return (
    <div className="container flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <h1 className="text-3xl font-bold">Chess Game</h1>
      
      {isCreatingGame ? (
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4">Creating a new game...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg text-center">
            {isConnected 
              ? "You don't have any active games." 
              : "Connecting to game server..."}
          </p>
          
          <div className="flex gap-4">
            <Button 
              onClick={handleCreateGame}
              disabled={!isConnected}
              size="lg"
            >
              Create New Game
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleCancel}
              size="lg"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}