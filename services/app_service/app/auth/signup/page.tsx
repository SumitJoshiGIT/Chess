'use client'
import React from "react"
import Auth from "@/components/custom/Auth"
export default function LoginPage() {
    
    //started fixing  a=b to a = b
    return (<div className="flex items-center justify-center  bg-red-500 h-full  ">
                      <Auth header="SignUp" type={0}/>   
          
            </div>
            )
}