import Box from '@mui/material/Box'
import Piece from './Piece'
import { useState,useRef } from 'react';
type matrix=number[][];
interface Props{
    gameID:string;
    board:matrix;
    player:string;
    userColor:number;
}

export default function({gameID}:Props){
    const userColor:boolean=false;
    const referenceClock=useRef(new Date());
    const [T1,setT1]=useState(0);
    const [T2,setT2]=useState(0);
    //const turn=useState(0);
    let [board,setBoard]=useState([
        [2, 5, 3, 1, 7, 3, 5, 2], // 1st row (White's major pieces)
        [4, 4, 4, 4, 4, 4, 4, 4], // 2nd row (White's pawns)
        [0, 0, 0, 0, 0, 0, 0, 0], // 3rd row (Empty)
        [0, 0, 0, 0, 0, 0, 0, 0], // 4th row (Empty)
        [0, 0, 0, 0, 0, 0, 0, 0], // 5th row (Empty)
        [0, 0, 0, 0, 0, 0, 0, 0], // 6th row (Empty)
        [-4, -4, -4, -4, -4,-4,-4,-4], // 7th row (Black's pawns)
        [-2,-5,-3,-1,-7,-3,-5,-2]  // 8th row (Black's major pieces)
      ]);//generated this matrix preset
    //if(userColor)board=board.reverse();

    return (<div>
        <Box>{T2}</Box>
       {board&&board.map((row,index)=>{
         return <Box key={index} style={{display:'flex', justifyContent:'center', alignItems:'center'}}>
           {row.map((cell,cindex)=><Piece allowed={(cell>0&&userColor)||cell<0} key={cindex} posX={index} posY={cindex} setPiece={setBoard} pvalue={cell} bg={((cindex+index-Number(userColor))%2)?"gray":"blue"}/>)}
        </Box>
        
       })}
       <Box>{T1}</Box>
     </div>)
 
}