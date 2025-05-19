import {create} from 'zustand';
import { z } from 'zod';

type Move={
    from:String;
    to:String;
}

const MoveSchema = z.object({
    from: z.string(),
    to: z.string(),
});

const GameSchema = z.object({
    gameID: z.string(),
    gameType: z.string(),
    gameStatus: z.string(),
    gameDescription: z.string(),
    state: z.string(),
    finalstate: z.string(),
    gameDate: z.string(),
    gameTime: z.string(),
    gameDuration: z.string(),
    gameWinner: z.string(),
    gameLoser: z.string(),
    gameMoves: z.array(MoveSchema),
});

class Game {
    gameID: String = '';
    gameType: String = '';
    gameStatus: String = '';
    gameDescription: String = '';
    state: String = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
    finalstate: String = '';
    gameDate: String = '';
    gameTime: String = '';
    gameDuration: String = '';

    gameWinner: String = '';
    gameLoser: String = '';
    gameMoves: Array<Move> = [];
    
    constructor() {}
    sendMove(move:Move){
        const validity=MoveSchema.safeParse(move);
        if(validity){
             this.gameMoves.push(move);        
        }
    }
}

type CounterStore={
    alertType:String;
    alertTitle:String;
    alertDescription:String;
    user: Object|null;  
    setUser:(value:Object)=>void;
    setAlertTitle:(value:String)=>void;
    setAlertType:(value:String)=>void;
    setAlertDescription:(value:String)=>void;
}


export const useStore=
    create<CounterStore>((set)=>({
        alertType:'',
        alertTitle:'',
        alertDescription:'',
        user:null,
        setUser:(value:Object)=>set((state)=>({...state,user:value})),
        setAlertDescription:(value:String)=>set((state)=>({...state,alertDescription:value})),
        setAlertTitle:(value:String)=>set((state)=>({...state,alertTitle:value})),
        setAlertType:(value:String)=>set((state)=>({...state,alertType:value})),
    }));

export default useStore;