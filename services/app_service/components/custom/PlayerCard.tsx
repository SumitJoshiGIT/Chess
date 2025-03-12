"use client"
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";

interface PlayerCardProps {
        name: string;
        elo: number;
}

export default function PlayerCard({ name, elo }: PlayerCardProps) {
    return (
        <div className="flex items-center shadow-md rounded-md m-2 mr-0 ml-0 p-2">
            <Avatar>
                <AvatarImage className="rounded-sm" src={`https://ui-avatars.com/api/?name=${name}`} alt={`${name}'s avatar`} />
                <AvatarFallback>{name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div style={{ marginLeft: '10px' }}>
                <div>{name}</div>
                <div style={{ fontSize: '0.8em', color: 'gray' }}>{elo}</div>
            </div>
        </div>
    );


}