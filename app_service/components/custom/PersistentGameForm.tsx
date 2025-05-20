"use client";

import React, { useRef, useState, useEffect } from 'react';
import GameForm from './GameForm';

// This is a special wrapper for GameForm that ensures it doesn't
// get unmounted during drawer/dialog transitions
const PersistentGameForm = () => {
  // Use a ref to keep a reference to the mounted GameForm
  const gameFormRef = useRef<HTMLDivElement>(null);
  
  // State to track if we've initialized
  const [initialized, setInitialized] = useState(false);
  
  // Debug lifecycle
  useEffect(() => {
    console.log('PersistentGameForm mounted');
    return () => {
      console.log('PersistentGameForm unmounted');
    };
  }, []);
  
  // Set initialized on first render
  useEffect(() => {
    if (!initialized) {
      console.log('Initializing PersistentGameForm');
      setInitialized(true);
      
      // Initialize with any previously stored state
      const gameInProgress = localStorage.getItem('chess_game_in_progress') === 'true';
      const savedGameId = localStorage.getItem('chess_current_game_id');
      if (gameInProgress || savedGameId) {
        console.log('PersistentGameForm loaded with active game', { gameInProgress, savedGameId });
      }
    }
  }, [initialized]);
  
  return (
    <div ref={gameFormRef} className="game-form-container">
      {initialized && <GameForm />}
    </div>
  );
};

export default PersistentGameForm;
