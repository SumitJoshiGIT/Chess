"use client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useForm, Controller} from "react-hook-form";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "./Socket";
import { useToast } from "@/components/ui/use-toast";

type GameFormValues = {
  timeControl: string;
};

const TIME_CONTROLS = [
  { label: "Blitz", options: [
    { label: "3 minutes", value: "blitz-3", id: 0 },
    { label: "5 minutes", value: "blitz-5", id: 1},
    { label: "10 minutes", value: "blitz-10", id: 2 },
  ]},
  { label: "Rapid", options: [
    { label: "10 minutes", value: "rapid-10", id: 3 },
    { label: "15 minutes", value: "rapid-15", id: 4 },
    { label: "25 minutes", value: "rapid-25", id: 5 },
  ]},
  { label: "Classical", options: [
    { label: "30 minutes", value: "classical-30", id: 6 },
    { label: "60 minutes", value: "classical-60", id: 7 },
    { label: "90 minutes", value: "classical-90", id: 8 },
  ]},
];

export default function GameSelector() {
  // Form state
  const { control, watch } = useForm<GameFormValues>({
    defaultValues: { timeControl: "" },
  });
  
  // Local state
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [userId, setUserId] = useState<string>('');
  const [lastToastMessage, setLastToastMessage] = useState<string>('');
  
  // Use a ref to track the true searching state that persists across re-renders
  const isReallySearching = useRef(false);
  
  // Track component mount time to prevent cancellation during quick UI transitions
  const mountTime = useRef(Date.now()).current;
  
  // Hooks
  const router = useRouter();
  const { toast } = useToast();
  
  // Socket context
  const { 
    isConnected, 
    connect, 
    findMatch, 
    cancelMatchmaking, 
    matchmakingStatus, 
    currentGameId, 
    error 
  } = useSocket();

  const selected = watch("timeControl");

  // Get user ID from localStorage on component mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId') || `user-${Math.random().toString(36).substring(2, 9)}`;
    setUserId(storedUserId);
    
    // Also check if we have a saved game or match status from previous renders
    const gameInProgress = localStorage.getItem('chess_game_in_progress') === 'true';
    const savedGameId = localStorage.getItem('chess_current_game_id');
    
    // If there's a game in progress, make sure our searching state and ref are reset
    if (gameInProgress || savedGameId) {
      isReallySearching.current = false;
      // Don't update setIsSearching here - we might be on the searching view still
    }
    
    // Connect to socket.io server if not already connected
    if (!isConnected) {
      connect(storedUserId);
    }
    
    // Save userId to localStorage if it's a new one
    if (!localStorage.getItem('userId')) {
      localStorage.setItem('userId', storedUserId);
    }
  }, [connect, isConnected]);

  // Display a toast message without duplicating
  const showToast = useCallback((title: string, message: string, variant: 'default' | 'destructive' = 'default') => {
    // Don't show the same message twice in a row
    if (lastToastMessage === message) return;
    
    // Don't show error messages for normal game events
    if (variant === 'destructive' && 
        (message.includes('Match found') || 
         message.includes('Looking for') || 
         message.includes('in queue'))) {
      variant = 'default';
    }
    
    toast({
      title,
      description: message,
      variant,
    });
    setLastToastMessage(message);
  }, [toast, lastToastMessage]);

  // Handle matchmaking status updates
  useEffect(() => {
    if (!matchmakingStatus) return;
    
    // If we have a current game, don't show status messages anymore
    if (currentGameId && matchmakingStatus.success && matchmakingStatus.message?.includes("Match found")) {
      // Only show game found message once
      if (!lastToastMessage.includes("Match found")) {
        showToast("Game Found!", "Redirecting to game...");
      }
      return;
    }
    
    // If matchmaking status has a message
    if (matchmakingStatus.message) {
      if (!matchmakingStatus.success) {
        // Show error and stop searching
        showToast("Matchmaking Error", matchmakingStatus.message, "destructive");
        setIsSearching(false);
      } else if (matchmakingStatus.message.includes("Match found")) {
        // Game found notification
        showToast("Game Found!", matchmakingStatus.message);
      } else if (!matchmakingStatus.message.includes("Looking for")) {
        // Regular status update (not initial search)
        showToast("Matchmaking Status", matchmakingStatus.message);
      }
    }
  }, [matchmakingStatus, currentGameId, showToast, lastToastMessage]);

  // Handle socket connection errors
  useEffect(() => {
    if (error) {
      showToast("Connection Error", error, "destructive");
    }
  }, [error, showToast]);

  // Handle game found - redirect to game page
  useEffect(() => {
    // Check for both currentGameId and match found status message
    const gameId = (typeof currentGameId === 'string' && currentGameId) || (matchmakingStatus && typeof (matchmakingStatus as any).gameId === 'string' ? (matchmakingStatus as any).gameId : null);
    const matchFound = !!gameId;

    // Only run if a game has been found and we're still in searching state
    if (!matchFound || !isSearching) return;

    console.log('Game found detected, preparing to redirect...', { currentGameId, matchmakingStatus });

    // Update our ref to indicate no longer searching
    isReallySearching.current = false;

    // Save that we have an active game to prevent cancellation during transitions
    localStorage.setItem('chess_game_in_progress', 'true');
    localStorage.setItem('chess_current_game_id', gameId || '');
    if (matchmakingStatus) {
      localStorage.setItem('chess_matchmaking_status', JSON.stringify(matchmakingStatus));
    }

    // Show game found notification
    showToast("Game Found!", "Redirecting to game...");

    // Stop searching state immediately to prevent unmount cleanups
    setIsSearching(false);

    console.log("Redirecting to game %s...", gameId);
    if (gameId) {
        console.log(`Redirecting to game ${gameId}...`);
        router.push(`/games/${gameId}`);
    }
 
  }, [currentGameId, matchmakingStatus, isSearching, router, showToast, isReallySearching]);

  // Timer for search duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isSearching) {
      interval = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
    } else {
      setSearchTime(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSearching]);
  
  // Store game state in localStorage to persist during navigation
  useEffect(() => {
    // If we have a match, store it in localStorage so we don't lose it during navigation
    if (currentGameId || (matchmakingStatus?.success && matchmakingStatus?.message?.includes('Match found'))) {
      console.log('Saving game in progress to localStorage', { currentGameId, matchmakingStatus });
      localStorage.setItem('chess_game_in_progress', 'true');
      localStorage.setItem('chess_current_game_id', currentGameId || '');
      
      // Also save the matchmaking status to ensure we remember a game was found
      if (matchmakingStatus) {
        localStorage.setItem('chess_matchmaking_status', JSON.stringify(matchmakingStatus));
      }
    }
  }, [currentGameId, matchmakingStatus]);
  
  // Cleanup - extremely careful about when to cancel matchmaking
  useEffect(() => {
    // Debug event to show when the effect is created
    console.log('GameForm cleanup effect created/updated');
    
    return () => {
      console.log('GameForm unmounting, checking if matchmaking should be cancelled...');
      
      // Get the saved game state from localStorage (works across remounts)
      const gameInProgress = localStorage.getItem('chess_game_in_progress') === 'true';
      const savedGameId = localStorage.getItem('chess_current_game_id');
      const matchmakingInProgress = localStorage.getItem('chess_matchmaking_in_progress') === 'true';
      
      // Try to parse the saved matchmaking status 
      let savedMatchStatus = null;
      try {
        const savedMatchString = localStorage.getItem('chess_matchmaking_status');
        if (savedMatchString) {
          savedMatchStatus = JSON.parse(savedMatchString);
        }
      } catch (e) {
        console.error('Failed to parse saved matchmaking status:', e);
      }
      const matchFound = (matchmakingStatus?.success && matchmakingStatus?.message?.includes('Match found')) ||
                         (savedMatchStatus?.success && savedMatchStatus?.message?.includes('Match found'));
                         
      const isFastUnmount = Date.now() - mountTime < 500; // 500ms threshold
      
      if (isReallySearching.current && !currentGameId && !matchFound && !gameInProgress && !savedGameId && !isFastUnmount) {
        console.log('Unmounting GameForm while searching - cancelling matchmaking');
        //cancelMatchmaking();
        isReallySearching.current = false; // Reset the ref
        localStorage.removeItem('chess_matchmaking_in_progress'); // Clear this flag
      } else {
        console.log('Unmounting GameForm but game already started or found - NOT cancelling matchmaking');
        // If we're transitioning to the game page, we'll clear this once the game loads
        if (currentGameId || matchFound || gameInProgress || savedGameId) {
          console.log(`Game in progress: ${gameInProgress}, Game ID: ${currentGameId || savedGameId}`);
        }
        if (isFastUnmount) {
          console.log('Fast unmount detected, likely a UI transition - NOT cancelling matchmaking');
        }
      }
    };
  }, [isSearching, cancelMatchmaking, currentGameId, matchmakingStatus, mountTime]);

  // Get game type ID from selected time control
  const getGameTypeId = (timeControl: string): string => {
    if (timeControl.startsWith('blitz')) return 'blitz';
    if (timeControl.startsWith('rapid')) return 'rapid';
    if (timeControl.startsWith('classical')) return 'classical';
    return 'rapid'; // Default
  };

  // Handle find opponent button click
  const handleFindOpponent = useCallback(() => {
    // Guard clauses
    if (!selected || !isConnected || isSearching) return;
    
    console.log('Starting matchmaking process...');
    
    // Set searching state FIRST before clearing anything else
    // Set both the state and the ref
    setIsSearching(true);
    isReallySearching.current = true;
    
    // Store this information in localStorage immediately to prevent race conditions
    localStorage.setItem('chess_matchmaking_in_progress', 'true');
    
    // Clear any stale game state to start fresh
    // But only do this if we don't have an active game
    if (!currentGameId && !(matchmakingStatus?.success && matchmakingStatus?.message?.includes('Match found'))) {
      localStorage.removeItem('chess_game_in_progress');
      localStorage.removeItem('chess_current_game_id');
      localStorage.removeItem('chess_matchmaking_status');
    }
    
    // Add a small delay to prevent race conditions where the socket call finishes before the state update
    setTimeout(() => {
      // Get game type and descriptive label
      const gameTypeId = getGameTypeId(selected);
      const selectedOption = TIME_CONTROLS.flatMap(group => group.options).find(opt => opt.value === selected);
      const timeControlLabel = selectedOption ? selectedOption.label : gameTypeId;
      
      // Show toast
      const message = `Looking for a ${gameTypeId} game (${timeControlLabel})...`;
      showToast("Searching for opponent", message);
      
      // Initiate matchmaking request
      console.log('Sending find-match event to socket...');
      findMatch(gameTypeId);
    }, 50); // Small delay to ensure state is properly updated first
  }, [selected, isConnected, isSearching, findMatch, showToast, currentGameId, matchmakingStatus]);

  // Handle cancel search button click
  const handleCancelSearch = useCallback(() => {
    // Don't cancel if a game has already been found
    if (currentGameId || (matchmakingStatus?.success && matchmakingStatus?.message?.includes('Match found'))) {
      return;
    }
    
    // Update both the state and the ref
    setIsSearching(false);
    isReallySearching.current = false;
    
    cancelMatchmaking();
    showToast("Search Cancelled", "Matchmaking cancelled");
  }, [cancelMatchmaking, showToast, currentGameId, matchmakingStatus]);

  // Format seconds into MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Keep our ref in sync with the searching state
  useEffect(() => {
    // Only update the ref from state when it's going from searching to not-searching
    // Don't update when going from not-searching to searching (that's handled in the button click)
    if (!isSearching && isReallySearching.current) {
      console.log('Search state changed to false, updating ref');
      isReallySearching.current = false;
    }
  }, [isSearching]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        {isSearching ? (
          // SEARCHING VIEW
          <div className="text-center transition-all duration-300 ease-in-out" data-testid="searching-view">
            <h3 className="text-xl font-bold mb-4">
              {currentGameId || (matchmakingStatus?.success && matchmakingStatus?.message?.includes('Match found')) ? "Game Found!" : "Finding an opponent..."}
            </h3>
            <div className="flex justify-center mb-4">
              <div className={`rounded-full h-12 w-12 border-t-2 border-b-2 border-primary ${currentGameId || (matchmakingStatus?.success && matchmakingStatus?.message?.includes('Match found')) ? 'animate-pulse' : 'animate-spin'}`}></div>
            </div>
            <p className="text-muted-foreground mb-2">Search time: {formatTime(searchTime)}</p>
            {matchmakingStatus?.position && !currentGameId && !(matchmakingStatus?.success && matchmakingStatus?.message?.includes('Match found')) && (
              <p className="text-muted-foreground mb-4">Position in queue: {matchmakingStatus.position}</p>
            )}
            {matchmakingStatus?.estimatedTime && !currentGameId && !(matchmakingStatus?.success && matchmakingStatus?.message?.includes('Match found')) && (
              <p className="text-muted-foreground mb-4">Estimated wait: ~{Math.ceil(matchmakingStatus.estimatedTime / 60)} min</p>
            )}
            {currentGameId || (matchmakingStatus?.success && matchmakingStatus?.message?.includes('Match found')) ? (
              <p className="text-primary font-medium mb-4">Redirecting to your game...</p>
            ) : (
              <Button 
                variant="destructive" 
                onClick={handleCancelSearch}
                className="w-full"
                data-testid="cancel-button"
              >
                Cancel
              </Button>
            )}
          </div>
        ) : (
          // SELECTION VIEW
          <div className="selection-view" data-testid="selection-view">
            <div className="space-y-4">
              <Controller
                name="timeControl"
                control={control}
                render={({ field }:any) => (
                  <>
                    {TIME_CONTROLS.map((group) => (
                      <div key={group.label}>
                        <Label className="text-lg font-semibold">{group.label}</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {group.options.map((option) => (
                            <Button
                              key={option.value}
                              type="button"
                              variant={selected === option.value ? "default" : "outline"}
                              value={option.value}
                              onClick={() => field.onChange(option.value)}
                              aria-pressed={selected === option.value}
                              data-testid={`time-option-${option.id}`}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              />
            </div>
            <Button 
              type="button" 
              className="mt-6 w-full" 
              disabled={!selected || !isConnected || isSearching}
              onClick={handleFindOpponent}
              data-testid="find-opponent-button"
            >
              {!isConnected ? "Connecting..." : (isSearching ? "Searching..." : "Find Opponent")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
