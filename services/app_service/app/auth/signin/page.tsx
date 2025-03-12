'use client'
import React from "react"
import Auth from "@/components/custom/Auth"
export default function LoginPage() {

//started fixing  a=b to a = b
return (<div className="flex items-center justify-center   h-screen  ">
                        <Auth header="SignIn" type={1}/>   
        </div>
        )
}

