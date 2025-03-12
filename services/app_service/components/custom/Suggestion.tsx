import { Card } from "../ui/card";
import { TooltipProvider,Tooltip,TooltipTrigger,TooltipContent } from "@radix-ui/react-tooltip";

export default function(props:{color:string,id:number,content:string,title:string}){
    return (
       <TooltipProvider>
           <Tooltip>
               <TooltipTrigger>
                   <Card className="w-fit p-1 min-w-24 ">
                      <p className="font-medium">{props.title}</p>
                   </Card>
               </TooltipTrigger>
               <TooltipContent className="rounded-md opacity-90 bg-white p-1 shadow-lg">
                   {props.content}
               </TooltipContent>
           </Tooltip>
       </TooltipProvider>
    );
}