import { Card, CardContent, CardTitle } from "../ui/card";
import Suggestion from './Suggestion';

interface SuggestionBoardProps{
    color:string,id:number,title:string,content:string

}
export default function({items}:{items:SuggestionBoardProps[]}){
    return (
        <Card className="p-3 h-68 w-full ">
              <CardTitle></CardTitle>
              <CardContent>
                 <div className="flex flex-wrap w-62 w-64 flex-col">
                        {items.map((item)=>{
                            return <Suggestion key={item.id} color={item.color} id={item.id} content={item.content} title={item.title}></Suggestion>
                        })}
                 </div>
              </CardContent>
        </Card>
    )
}