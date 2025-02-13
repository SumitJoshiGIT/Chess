import { Button } from "../ui/button"
import { Card } from "../ui/card"
export  default function Page(){
    return (
        <div className="flex justify-center items-center  h-full w-full">      
                <Button className="m-2">Play Player</Button>
                <Button className="m-2">Play Computer</Button>
        </div>
    )
}