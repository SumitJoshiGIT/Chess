import { checkAllGamesForTimeouts } from '../lib/redis.js';

// Interval time in milliseconds
const CHECK_INTERVAL_MS = 30000; // 30 seconds

// Keep track of the interval
let timeoutCheckerInterval: NodeJS.Timeout | null = null;

// Start the timeout checker
export function startTimeoutChecker() {
  if (timeoutCheckerInterval) {
    console.log('Timeout checker already running');
    return;
  }
  
  console.log('Starting game timeout checker');
  timeoutCheckerInterval = setInterval(() => {
    checkAllGamesForTimeouts().catch(err => {
      console.error('Error in timeout checker interval:', err);
    });
  }, CHECK_INTERVAL_MS);
}

// Stop the timeout checker
export function stopTimeoutChecker() {
  if (timeoutCheckerInterval) {
    clearInterval(timeoutCheckerInterval);
    timeoutCheckerInterval = null;
    console.log('Stopped game timeout checker');
  }
}

export default {
  startTimeoutChecker,
  stopTimeoutChecker
};
