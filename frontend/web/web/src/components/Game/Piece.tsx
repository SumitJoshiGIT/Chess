
let mapping:Record<number,string>;
import Button from '@mui/joy/Button';
import React from 'react';
mapping={
    7:"&#9812",//king
    1:"&#9813",//queeen
    2:"&#9814",//rook
    3:"&#9815",//bishop
    4:"&#9817",//pawn
    5:'&#9822',//knight
}
const validator_mapping:Record<number, (fromX: number, fromY: number, toX: number, toY: number) => boolean | undefined>={
    
    7:(fromX:number,fromY:number,toX:number,toY:number)=>{
        const x=Math.abs(toX-fromX);
        const y=Math.abs(toY-fromY);
        if(x<=1&&y<=1)return true;
        return false;
    },//king
    1:(fromX:number,fromY:number,toX:number,toY:number)=>{
        const x=Math.abs(toX-fromX);
        const y=Math.abs(toY-fromY);
        if(x===y||x==0||y==0)return true;
        return false;
    },//queen
    2:(fromX:number,fromY:number,toX:number,toY:number)=>{
        const x=Math.abs(toX-fromX);
        const y=Math.abs(toY-fromY);
        if(x==0||y==0)return true;
    },//rook
    3:(fromX:number,fromY:number,toX:number,toY:number)=>{
        const x=Math.abs(toX-fromX);
        const y=Math.abs(toY-fromY);
        if(x===y)return true;
        return false;
    },//bishop
    4:(fromX:number,fromY:number,toX:number,toY:number)=>{
        const x=Math.abs(toX-fromX);
        const y=Math.abs(toY-fromY);
        console.log(x,y,fromX,fromY);
        if(x==1||(x==2&&fromX==6))return true;
        return false;
    },//pawn
    5:(fromX:number,fromY:number,toX:number,toY:number)=>{
        const x=Math.abs(toX-fromX);
        const y=Math.abs(toY-fromY);
        if((x==1&&y==2)||(x==2&&y==1))return true;
        return false;   
    },//knight
}


type matrix=number[][]
interface Props{
    pvalue:number;
    bg:string,
    posX:number,
    posY:number,
    allowed:boolean,
    setPiece:React.Dispatch<React.SetStateAction<matrix>>,
}
export default function({pvalue,bg,posX,posY,allowed,setPiece}:Props){
    const value:string =mapping[Math.abs(pvalue)];
    const identity:string=(pvalue>0)?"white":"black";
    function dragStart(event:React.DragEvent){
        event.dataTransfer.setData('application/json',JSON.stringify([posX,posY,pvalue,allowed]))
    }
    function dragOver(event:React.DragEvent){
        if(!allowed){
        event.preventDefault();
        }
    }
    function drop(event:React.DragEvent){
       if(!allowed){ 
        event.preventDefault();
        const data=JSON.parse(event.dataTransfer.getData('application/json'));
        if(data){
            const [fromX,fromY,piece]=data;

            if(validator_mapping[Math.abs(piece)](fromX,fromY,posX,posY)){
            setPiece((values)=>{
                const nvalues=[...values];
                nvalues[posX][posY]=piece;
                nvalues[fromX][fromY]=0;
                return nvalues;
            })
        }
        } }
    }
 
 return( <Button draggable={Boolean(pvalue&&allowed)} onDragOver={dragOver} onDrop={drop} onDragStart={dragStart} className={"opacity-50 shadow-lg min-w-20 min-h-20 shadow-md overflow-hidden "} sx={{margin:"3px",backgroundColor:bg,padding:'3px',height:'70px'}} variant="solid">
             <p className='text-6xl bg-transparent w-full h-full rounded-md'  style={{color:identity}} dangerouslySetInnerHTML={{ __html:value }} ></p>
        </Button>
        )

}