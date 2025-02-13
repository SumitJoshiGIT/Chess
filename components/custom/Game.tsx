
import Piece from '@/components/custom/Piece'
import PlayerCard from '@/components/custom/PlayerCard'
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
        [2, 5, 3, 1, 7, 3, 5, 2], 
        [4, 4, 4, 4, 4, 4, 4, 4], //white
        [0, 0, 0, 0, 0, 0, 0, 0], 
        [0, 0, 0, 0, 0, 0, 0, 0], 
        [0, 0, 0, 0, 0, 0, 0, 0], 
        [0, 0, 0, 0, 0, 0, 0, 0], 
        [-4, -4, -4, -4, -4,-4,-4,-4], //back
        [-2,-5,-3,-1,-7,-3,-5,-2] 
      ]);

    return (<div>
        
       <div className='flex justify-center flex-col items-center'>
       <PlayerCard name={"Player2"} elo={120} ping={4}></PlayerCard>
       <div className='shadow-lg rouned-md w-fit h-fit'>{
         board&&board.map((row,index)=>{
         return <div key={index} style={{width:'100%',display:'flex', justifyContent:'center', alignItems:'center'}}>
           {row.map((cell,cindex)=><Piece allowed={(cell>0&&userColor)||cell<0} key={cindex} posX={index} posY={cindex} setPiece={setBoard} pvalue={cell} bg={((cindex+index-Number(userColor))%2)?"gray":"blue"}/>)}
        </div>  
       })}
       </div>
       <PlayerCard name={"Player1"} elo={120} ping={4}></PlayerCard>
       </div>
       <div>{T1}</div>
     </div>)
 
}