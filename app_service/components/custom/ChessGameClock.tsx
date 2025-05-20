"use client";

import { useEffect, useRef, useState } from "react";

interface ClockProps {
  gameActive: boolean;
  whiteTime: number;
  blackTime: number;
  currentTurn: 'w' | 'b' | null;
  lastMoveTime: string | null;
  onUpdateTimes: (whiteTime: number, blackTime: number) => void;
}

export default function ChessGameClock({
  gameActive,
  whiteTime,
  blackTime,
  currentTurn,
  lastMoveTime,
  onUpdateTimes,
}: ClockProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [internalWhiteTime, setInternalWhiteTime] = useState(whiteTime);
  const [internalBlackTime, setInternalBlackTime] = useState(blackTime);
  
  // Sync internal state with props when they change
  useEffect(() => {
    setInternalWhiteTime(whiteTime);
    setInternalBlackTime(blackTime);
  }, [whiteTime, blackTime]);

  useEffect(() => {
    if (!gameActive || !currentTurn || !lastMoveTime) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      console.log("Clock inactive:", { gameActive, currentTurn, lastMoveTime });
      return;
    }
    
    console.log("Clock active:", { gameActive, whiteTime, blackTime, currentTurn, lastMoveTime });
    
    // Initial adjustment based on server time
    const serverLastMoveTime = new Date(lastMoveTime).getTime();
    const nowTime = new Date().getTime();
    const elapsedSinceLastMove = Math.floor((nowTime - serverLastMoveTime) / 1000);
    
    console.log("Time elapsed since last move:", elapsedSinceLastMove);
    
    // Update adjusted times
    let newWhiteTime = whiteTime;
    let newBlackTime = blackTime;
    
    if (currentTurn === 'w') {
      newWhiteTime = Math.max(0, whiteTime - elapsedSinceLastMove);
    } else if (currentTurn === 'b') {
      newBlackTime = Math.max(0, blackTime - elapsedSinceLastMove);
    }
    
    setInternalWhiteTime(newWhiteTime);
    setInternalBlackTime(newBlackTime);
    
    // Immediately update parent component
    onUpdateTimes(newWhiteTime, newBlackTime);
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Only set interval if game is active and there's time left
    if (gameActive && newWhiteTime > 0 && newBlackTime > 0) {
      const intervalStartTime = new Date().getTime();
      
      timerRef.current = setInterval(() => {
        const now = new Date().getTime();
        const elapsedSinceInterval = Math.floor((now - intervalStartTime) / 1000);
        
        let updatedWhite = newWhiteTime;
        let updatedBlack = newBlackTime;
        
        // Update the time of the player whose turn it is
        if (currentTurn === 'w') {
          updatedWhite = Math.max(0, newWhiteTime - elapsedSinceInterval);
          setInternalWhiteTime(updatedWhite);
        } else if (currentTurn === 'b') {
          updatedBlack = Math.max(0, newBlackTime - elapsedSinceInterval);  
          setInternalBlackTime(updatedBlack);
        }
        
        // Force a time update on every tick for UI responsiveness
        onUpdateTimes(updatedWhite, updatedBlack);
        
        // Log updates less frequently to reduce console noise
        if (elapsedSinceInterval % 5 === 0) {
          console.log("Timer update:", { 
            updatedWhite, 
            updatedBlack, 
            elapsed: elapsedSinceInterval,
            currentTurn
          });
        }
        
        // Stop the timer if time runs out
        if (updatedWhite <= 0 || updatedBlack <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      }, 100); // Update every 100ms for even smoother UI updates
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameActive, whiteTime, blackTime, currentTurn, lastMoveTime, onUpdateTimes]);
  
  return null; // This is a logic-only component
}
