
interface PlayerCardProps {
        name: string;
        elo: number;
        ping: number;
    
}
export default function PlayerCard({name,elo,ping}:PlayerCardProps){
    
    return (
       
        <div className="bg-gray-800 p-1  shadow-md">
            <h1 className="text-md font-bold text-white">{name}</h1>
            <p className="text-sm text-white">{elo}</p>
        </div>
    )


}