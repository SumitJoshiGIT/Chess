import { Button } from "../ui/button"
import { Card } from "../ui/card"
import { Avatar, AvatarFallback } from "@radix-ui/react-avatar"
interface ActivityLinksProps{
    title:string,
    description:string,
    image:string,
}
export  default function(props:ActivityLinksProps){
    return <>
        <div className="  w-fit h-fit p-1 m-1">
            <div className=" shadow-lg rounded-md m-1">
                <Avatar >
                    <img className="w-40 h-40 shadow-lg rounded-md " src={props.image} alt={props.title} />
                </Avatar> 
             <Button className=" mt-2 font-semibold text-md w-40">{props.title}</Button>
            </div>
            
        </div>
    </>
}