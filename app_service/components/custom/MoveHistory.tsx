import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useEffect, useRef } from "react";

interface MoveHistoryProps {
  moves?: Array<{
    from?: { square: string }; // Updated to match GameState.moves
    to?: { square: string };   // Updated to match GameState.moves
    piece?: string;
    san?: string;
    notation?: string;
    color?: string;
    timestamp?: string;
  }> | string[];
  moveHistory?: string[]; // For backward compatibility
}

export default function MoveHistory({ moves, moveHistory }: MoveHistoryProps) {
  const moveListRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to latest move
  useEffect(() => {
    if (moveListRef.current) {
      moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
    }
  }, [moves, moveHistory]);
  
  // Format moves into pairs for display (white and black moves)
  const formattedMoves = [];
  
  // Use either moves or moveHistory
  const movesToUse = moves || moveHistory || [];
  
  for (let i = 0; i < movesToUse.length; i += 2) {
    formattedMoves.push({
      number: Math.floor(i / 2) + 1,
      white: getMoveNotation(movesToUse[i]),
      whiteTime: getTimeFromMove(movesToUse[i]),
      black: i + 1 < movesToUse.length ? getMoveNotation(movesToUse[i + 1]) : "",
      blackTime: i + 1 < movesToUse.length ? getTimeFromMove(movesToUse[i + 1]) : ""
    });
  }

  // Helper function to get a consistent notation from different move formats
  function getMoveNotation(move: any): string {
    if (!move) return "";
    
    // If it's a simple string (for backward compatibility)
    if (typeof move === 'string') return move;
    
    // Use SAN notation if available (Standard Algebraic Notation)
    if (move.san) return move.san;
    
    // Use custom notation if available
    if (move.notation) return move.notation;
    
    // Fall back to from-to format, checking for the nested .square property
    if (move.from && move.from.square && move.to && move.to.square) {
      return `${move.piece || ""}${move.from.square}-${move.to.square}`;
    }
    
    // Last resort: stringify the object
    return JSON.stringify(move);
  }
  
  // Helper function to get the time taken for a move
  function getTimeFromMove(move: any): string {
    if (!move || typeof move === 'string' || !move.timestamp) return "";
    
    try {
      // Format the timestamp as HH:MM:SS
      const date = new Date(move.timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return "";
    }
  }

  return (
    <div className="w-full max-h-[500px] overflow-auto" ref={moveListRef}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">#</TableHead>
            <TableHead>White</TableHead>
            <TableHead>Black</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {formattedMoves.length > 0 ? (
            formattedMoves.map((moveSet) => (
              <TableRow key={moveSet.number} className={moveSet.number === formattedMoves.length ? "bg-blue-50" : ""}>
                <TableCell>{moveSet.number}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{moveSet.white}</span>
                    {moveSet.whiteTime && <span className="text-xs text-gray-500">{moveSet.whiteTime}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{moveSet.black}</span>
                    {moveSet.blackTime && <span className="text-xs text-gray-500">{moveSet.blackTime}</span>}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-gray-500">
                No moves yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
