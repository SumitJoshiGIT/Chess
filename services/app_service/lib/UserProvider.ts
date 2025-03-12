'use client'
import React from "react"
import useStore from "@/lib/store";
export default function UserProvider({children,user}:{children:React.ReactNode,user:Object}) {
    const setUser = useStore((state) => state.setUser);
    setUser(user);
    return (
         children
    )
}