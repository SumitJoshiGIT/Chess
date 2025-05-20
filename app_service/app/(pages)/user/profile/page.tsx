"use client"
import React, { useEffect, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { useStore } from "@/lib/store";
type Game = { name: string; date: string; result: string; opponentId?: string; opponentName?: string };
type DataPoint = { month: string; elo: number };
type Friend = { name: string; rating: number; image: string };
type Rating = { type: string; rating: number };

type UserProfile = {
  name: string;
  role: string;
  image: string;
};

// Helper to fetch username by userId
async function fetchUsername(userId: string): Promise<string> {
  try {
    const res = await fetch(`/api/user/profile/${userId}`);
    if (!res.ok) return userId;
    const data = await res.json();
    return data.name || userId;
  } catch {
    return userId;
  }
}

// Helper to safely get user fields
function getUserField(user: any, field: string, fallback = "") {
  if (!user || typeof user !== "object") return fallback;
  return user[field] ?? fallback;
}

// Helper to get userId from user object
function getUserId(user: any): string | undefined {
  if (!user || typeof user !== "object") return undefined;
  return (user as any).id || (user as any)._id || (user as any).userId;
}

// Helper to clone user object safely
function cloneUser(user: any) {
  return user ? JSON.parse(JSON.stringify(user)) : {};
}

export default function Profile() {
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  // Defensive: get userId if present
  const userId = getUserId(user);

  useEffect(() => {
    if (!userId) return;
    // Example: fetch games for the user
    async function fetchGames() {
      setLoading(true);
      // Replace with your real API endpoint
      const res = await fetch(`/api/game/user/${userId}`);
      const data = await res.json();
      // Assume data.games is an array of { name, date, result, opponentId }
      // Fetch usernames for each opponent
      const gamesWithNames = await Promise.all(
        (data.games || []).map(async (game: any) => {
          const opponentName = game.opponentId ? await fetchUsername(game.opponentId) : "-";
          return { ...game, opponentName };
        })
      );
      setGames(gamesWithNames);
      setLoading(false);
    }
    fetchGames();
  }, [userId]);

  const data: DataPoint[] = [
    { month: "January", elo: 65 },
    { month: "February", elo: 59 },
    { month: "March", elo: 80 },
    { month: "April", elo: 81 },
    { month: "May", elo: 56 },
    { month: "June", elo: 55 },
    { month: "July", elo: 40 },
  ];

  const friends: Friend[] = [
    { name: "Alice", rating: 1800, image: "https://github.com/shadcn.png" },
    { name: "Bob", rating: 2000, image: "https://github.com/shadcn.png" },
  ];

  const ratings: Rating[] = [
    { type: "Blitz", rating: 1900 },
    { type: "Rapid", rating: 2000 },
    { type: "Bullet", rating: 1850 },
    { type: "Classical", rating: 2100 },
    { type: "Puzzles", rating: 2200 },
  ];

  return (
    <div className="flex flex-col items-center min-h-screen p-6 bg-gray-100 dark:bg-gray-900 text-gray-900 rounded-md dark:text-gray-100">
      <div className="flex  flex-wrap">
        
        <Card className="w-[400px] rounded-md p-4">
        
          <CardHeader className="hidden">
            <CardTitle className="text-2xl font-bold">Profile</CardTitle>
          </CardHeader>
        
          <CardContent className="w-full shadow-lg rounded-md p-4  bg-white ">
            <div className="flex">
            <Avatar className="w-24 h-24 mx-auto">
              <AvatarImage src={getUserField(user, "image")} alt={getUserField(user, "name", "U")} />
              <AvatarFallback>{getUserField(user, "name", "U").charAt(0)}</AvatarFallback>
            </Avatar>
             <div className="pl-4"> 
              <input
                className="mt-4 w-full text-xl font-semibold bg-transparent  "
                value={getUserField(user, "name")}
                onChange={(e) => setUser({ ...cloneUser(user), name: e.target.value })}
              />
              <input
                className="mt-2 w-full  bg-transparent "
                value={getUserField(user, "role")}
                onChange={(e) => setUser({ ...cloneUser(user), role: e.target.value })}
              />
             </div>
             </div>
             <div>
             </div> 
          </CardContent>
          
          <input
                className="mt-4 w-full text-md text-gray-400 bg-transparent"
                value={getUserField(user, "name")}
                onChange={(e) => setUser({ ...cloneUser(user), name: e.target.value })}
              />

        </Card>

        <div className="w-[400px]  bg-white  rounded-md shadow-md p-2 m-4">

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="elo" stroke="#4b9ca5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Tabs className="mt-6 w-full max-w-4xl ">
        <TabsList className="bg-white shadow-md">
          <TabsTrigger value="games">Game History</TabsTrigger>
          <TabsTrigger value="stats">Performance</TabsTrigger>
          <TabsTrigger value="friends">Chess Friends</TabsTrigger>
        </TabsList>
        <TabsContent value="games">
          <Table className="w-full bg-white shadow-md rounded-md">
            <TableHeader>
              <TableRow>
                <TableHead>Game Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Opponent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow>
              ) : (
                games.map((game, index) => (
                  <TableRow key={index}>
                    <TableCell>{game.name}</TableCell>
                    <TableCell>{game.date}</TableCell>
                    <TableCell>{game.result}</TableCell>
                    <TableCell>{game.opponentName}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="stats">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ratings.map((rating, index) => (
              <Card key={index} className="p-4 shadow-lg text-center">
                <p className="font-semibold">{rating.type}</p>
                <p className="text-gray-600 dark:text-gray-400">Rating: {rating.rating}</p>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="friends">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {friends.map((friend, index) => (
              <Card key={index} className="p-4 shadow-lg flex items-center space-x-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={friend.image} alt={friend.name} />
                  <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{friend.name}</p>
                  <p className="text-gray-600 dark:text-gray-400">Rating: {friend.rating}</p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
