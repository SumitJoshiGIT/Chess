import { Avatar,AvatarImage,AvatarFallback } from "@radix-ui/react-avatar";
import PersistentGameForm from "./PersistentGameForm";
import { Button } from "../ui/button"
import { Card,CardTitle,CardDescription} from "../ui/card"
import DrawerProvider from "./DrawerProvider";
interface CardProps{
    elo:number;
    league:string;
    icon:string,

}
export  default function Page(props:CardProps){
    return (
         <div className="flex justify-center items-center flex-col rounded-md   w-full p-4 shadow-md font-bold h-full ">      
                <div className="flex w-full items-center p-2">
                  <Avatar >
                    <AvatarImage className="rounded-full w-12 h-12 bg-gray-800" src="https://github.com/shadcn.png" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <Card className="h-14 flex  ml-2 p-2 ">
                    <div>
                     <CardTitle className="text-md font-bold mr-2">{props.elo||"Unknown"}</CardTitle>
                     <CardDescription className="text-sm">
                      {props.league||"0"} 
                    </CardDescription>
                    </div>
                    <Avatar className="">
                     <AvatarImage className=" w-8 h-8 bg-gray-800" src={props.icon} />
                     <AvatarFallback className=" "></AvatarFallback>
                     </Avatar>
                  </Card>
                  
                  
                    
                </div>
                <DrawerProvider  tag={"Play Player"} className="m-2 w-56 h-16 text-lg flex justify-start pl-5 shadow-md opacity-80  font-bold ">
                   <PersistentGameForm />
                </DrawerProvider>
                
                <DrawerProvider  tag={"Play Bots"} className="m-2 w-56 h-16 text-lg flex justify-start pl-5 font-bold shadow-md opacity-80 ">
                  <div>Coming soon</div>
                </DrawerProvider>
                
                <DrawerProvider  tag={"Play Friend"} className="m-2 w-56 h-16 text-lg flex justify-start pl-5 font-bold shadow-md opacity-80 ">
                  <div>Coming soon</div>
                </DrawerProvider>
                
                 </div>
    )
}