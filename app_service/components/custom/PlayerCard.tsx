"use client"
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";

interface PlayerCardProps {
    name: string;
    elo: number;
    time?: string;
    isActive?: boolean;
    ping?: number;
}

export default function PlayerCard({ name, elo, time, isActive, ping }: PlayerCardProps) {
    return (
        <div className={`flex items-center shadow-md rounded-md p-2 ${isActive ? 'border-l-4 border-blue-500 bg-blue-50' : ''} transition-all duration-300`}>
            <Avatar>
                <AvatarImage 
                    className="rounded-sm w-10 h-10" 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`} 
                    alt={`${name}'s avatar`} 
                />
                <AvatarFallback className="w-10 h-10 bg-gray-200 flex items-center justify-center text-gray-700 rounded-sm">
                    {name.charAt(0).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <div className="ml-3 flex-1">
                <div className="font-medium truncate max-w-[150px]">{name}</div>
                <div className="flex gap-2 items-center">
                    <span className="text-xs text-gray-600">{elo}</span>
                    {time && (
                        <span className={`text-xs px-2 py-1 rounded-full font-mono border ${
                            isActive 
                                ? 'bg-blue-100 text-blue-800 font-semibold border-blue-300' 
                                : 'bg-gray-100 text-gray-800 border-gray-200'
                            } ${
                                time.startsWith('0:') && isActive
                                ? 'animate-pulse text-red-600 font-bold border-red-300'
                                : ''
                            }`}>
                            {time}
                            {isActive && (
                                <span 
                                    className="ml-1 inline-block h-2 w-2 rounded-full bg-red-500"
                                    style={{
                                        animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                                    }}
                                ></span>
                            )}
                        </span>
                    )}
                    {ping !== undefined && <span className="text-xs text-green-600">{ping}ms</span>}
                </div>
            </div>
        </div>
    );
}