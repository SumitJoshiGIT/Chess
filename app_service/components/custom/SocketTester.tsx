"use client";

import { useState, useEffect } from "react";
import { useSocket } from "./Socket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export default function SocketTester() {
  const { 
    socket, 
    isConnected, 
    connect,
    disconnect,
    error,
    findMatch,
    createDirectGame,
    cancelMatchmaking,
    matchmakingStatus,
    currentGameId,
    gameState
  } = useSocket();
  
  const [userId, setUserId] = useState<string>("");
  const [messages, setMessages] = useState<string[]>([]);
  const [customEvent, setCustomEvent] = useState<string>("find-match");
  const [customPayload, setCustomPayload] = useState<string>('{"gameTypeId": "rapid"}');
  const { toast } = useToast();

  // Initialize user ID from localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId') || `user-${Math.random().toString(36).substring(2, 9)}`;
    setUserId(storedUserId);
  }, []);

  // Log status changes
  useEffect(() => {
    if (isConnected) {
      addMessage("Connected to server");
    } else {
      addMessage("Disconnected from server");
    }
  }, [isConnected]);

  // Log errors
  useEffect(() => {
    if (error) {
      addMessage(`Error: ${error}`);
      toast({
        title: "Socket Error",
        description: error,
        variant: "destructive"
      });
    }
  }, [error, toast]);

  // Log matchmaking status
  useEffect(() => {
    if (matchmakingStatus) {
      addMessage(`Matchmaking status: ${JSON.stringify(matchmakingStatus)}`);
    }
  }, [matchmakingStatus]);

  // Log game state
  useEffect(() => {
    if (currentGameId && gameState) {
      addMessage(`Game found: ${currentGameId}`);
      addMessage(`Game state: ${JSON.stringify(gameState, null, 2)}`);
    }
  }, [currentGameId, gameState]);

  const addMessage = (message: string) => {
    setMessages(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleConnect = () => {
    if (userId) {
      connect(userId);
      localStorage.setItem('userId', userId);
    } else {
      toast({
        title: "Input Required",
        description: "Please enter a user ID",
        variant: "destructive"
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleClearLog = () => {
    setMessages([]);
  };

  const handleSendCustomEvent = () => {
    if (!isConnected || !socket) {
      toast({
        title: "Not Connected",
        description: "Please connect to the server first",
        variant: "destructive"
      });
      return;
    }

    try {
      const payload = JSON.parse(customPayload);
      socket.emit(customEvent, payload);
      addMessage(`Sent event: ${customEvent} with payload: ${customPayload}`);
    } catch (err) {
      toast({
        title: "Invalid JSON",
        description: "Please enter valid JSON payload",
        variant: "destructive"
      });
    }
  };

  const handleFindMatch = () => {
    findMatch("rapid");
    addMessage("Finding match (game type: rapid)");
  };

  const handleCancelMatch = () => {
    cancelMatchmaking();
    addMessage("Cancelled matchmaking");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Socket.IO Connection Tester</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input 
                  id="userId" 
                  value={userId} 
                  onChange={(e) => setUserId(e.target.value)} 
                  placeholder="Enter a user ID"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Connection Status</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>
              
              <div className="space-y-2 pt-8">
                <div className="flex space-x-2">
                  <Button onClick={handleConnect} disabled={isConnected}>Connect</Button>
                  <Button onClick={handleDisconnect} disabled={!isConnected} variant="destructive">Disconnect</Button>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="mb-2 font-medium">Game Actions</h3>
              <div className="flex space-x-2">
                <Button onClick={handleFindMatch} disabled={!isConnected}>Find Match</Button>
                <Button onClick={handleCancelMatch} disabled={!isConnected} variant="outline">Cancel Match</Button>
                <Button 
                  onClick={() => {
                    // Create a direct game for testing
                    if (isConnected) {
                      createDirectGame('rapid');
                      addMessage("Created a test game with type: rapid");
                    }
                  }} 
                  disabled={!isConnected} 
                  variant="outline"
                >
                  Create Test Game
                </Button>
              </div>
              
              {currentGameId && (
                <div className="mt-4 p-3 bg-gray-100 rounded">
                  <p className="font-medium">Game Created: {currentGameId}</p>
                  <Button 
                    className="mt-2"
                    onClick={() => {
                      window.open(`/games/${currentGameId}`, '_blank');
                    }}
                  >
                    Open Game
                  </Button>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="mb-2 font-medium">Custom Event</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eventName">Event Name</Label>
                  <Input 
                    id="eventName" 
                    value={customEvent} 
                    onChange={(e) => setCustomEvent(e.target.value)} 
                    placeholder="Event name"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="payload">Payload (JSON)</Label>
                  <Input 
                    id="payload" 
                    value={customPayload} 
                    onChange={(e) => setCustomPayload(e.target.value)} 
                    placeholder='{"key": "value"}'
                  />
                </div>
                <div className="space-y-2 pt-8">
                  <Button onClick={handleSendCustomEvent} disabled={!isConnected}>Send Event</Button>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Event Log</h3>
                <Button variant="outline" size="sm" onClick={handleClearLog}>Clear Log</Button>
              </div>
              <div className="bg-gray-100 p-3 rounded h-[200px] overflow-y-auto font-mono text-xs">
                {messages.length > 0 ? (
                  messages.map((msg, index) => (
                    <div key={index} className="pb-1">
                      {msg}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">No events logged yet</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
