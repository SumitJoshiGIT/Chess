import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"
import { Label } from "recharts"

export default function GamesTable(){
  return(
  <div className="rounded-md shadow-lg m-2"> 
  <Table >
  <TableHeader>
    <TableRow>
      <TableHead className="w-[100px]">Opponent</TableHead>
      <TableHead>Category</TableHead>
      <TableHead>Duration</TableHead>
      <TableHead className="text-right">Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="font-medium">N1</TableCell>
      <TableCell>C1</TableCell>
      <TableCell>S1</TableCell>
      <TableCell className="text-right">P1</TableCell>
    </TableRow>
  </TableBody>
</Table>
</div>
)
}
