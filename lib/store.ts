import {create} from 'zustand';

type CounterStore={
    alertType:String;
    alertTitle:String;
    alertDescription:String;
    setAlertTitle:(value:String)=>void
    setAlertType:(value:String)=>void
    setAlertDescription:(value:String)=>void
}


export const useStore=
    create<CounterStore>((set)=>({
        alertType:'',
        alertTitle:'',
        alertDescription:'',
        setAlertDescription:(value:String)=>set((state)=>({...state,alertDescription:value})),
        setAlertTitle:(value:String)=>set((state)=>({...state,alertTitle:value})),
        setAlertType:(value:String)=>set((state)=>({...state,alertType:value})),
    }));