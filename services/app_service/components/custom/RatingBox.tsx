import { Card } from "../ui/card"
export default function({blitz,rapid,bullet}:{blitz:number,rapid:number,bullet:number}){

 return (<Card className=" p-2  ml-2 mr-2 items-stretch justify-evenly flex  ">
         <div className="flex flex-col text-lg justify-center items-center">
            <div className="font-bold">Rapid</div>
            <div className="w-full flex items-center justify-center">{rapid}</div>
         </div>
         <div className="flex flex-col text-lg justify-center items-center">
            <div className="font-bold">Blitz</div>
            <div className="w-full flex items-center justify-center">{blitz}</div>         
         </div>
         <div className="flex flex-col text-lg justify-center items-center">
            <div className="font-bold">Bullet</div>
            <div className="w-full flex items-center justify-center">{bullet}</div>
         </div>
    </Card>)
}