import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

interface MoveHistoryProps {
  moveHistory: string[];
}

export default function MoveHistory({ moveHistory }: MoveHistoryProps) {
  return (
    <div className="flex flex-col items-center w-full space-y-3 m-2">
      <Card className="w-[400px] max-h-40 overflow-auto p-2">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>White</TableHead>
                <TableHead>Black</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {moveHistory.map((move, index) => (
                index % 2 === 0 && (
                  <TableRow key={index}>
                    <TableCell>{Math.floor(index / 2) + 1}</TableCell>
                    <TableCell>{move}</TableCell>
                    <TableCell>{moveHistory[index + 1] || ""}</TableCell>
                  </TableRow>
                )
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}