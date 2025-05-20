import { useState, useEffect } from 'react';

interface PlayerProfile {
  name: string;
  elo: number;
}

export function usePlayerProfile(playerId: string | undefined) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!playerId) {
        setProfile(null);
        return;
      }

      try {
        const response = await fetch(`/api/user/profile/${playerId}`);
        if (!response.ok) {
          const fallbackProfile = { name: `Player ${playerId.substring(0,6)}`, elo: 1200 };
          setProfile(fallbackProfile);
          return;
        }
        const data = await response.json();
        setProfile({
          name: data.name || `Player ${playerId.substring(0,6)}`,
          elo: data.elo || 1200
        });
      } catch (err) {
        const fallbackProfile = { name: `Player ${playerId.substring(0,6)}`, elo: 1200 };
        setProfile(fallbackProfile);
      }
    };

    fetchProfile();
  }, [playerId]); // Only re-fetch when playerId changes

  return profile;
}
