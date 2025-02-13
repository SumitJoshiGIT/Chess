"use client"


import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {useState} from "react";


interface ProviderWrapperProps {
    children:React.ReactNode 
}

export default function tanstackProvider ({children}:ProviderWrapperProps) {
    const [client] = useState(()=>new QueryClient());
    return (
        <QueryClientProvider client={client}>
            {children}
        </QueryClientProvider>
    )
}
