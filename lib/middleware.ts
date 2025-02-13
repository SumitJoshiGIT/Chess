import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
import {getToken} from 'next-auth/jwt';
import { NextApiRequest,NextApiResponse } from 'next';


export async function middleware(req:NextRequest){
    const token =await getToken({
        req,
        secret: process.env.JWT_SECRET,
    })
    if(!token){
            return NextResponse.redirect(
                new URL("api/auth/signin",req.url)   
            )
    }
    return NextResponse.next(); 
}

export async function errorHandler(handler:any){
        return async (req:NextApiRequest,res:NextApiResponse)=>{
            try{
                return await handler(req,res);
            }catch(e:any){
                return res.json({
                    success:false,
                    error:e.message
                })
            }

        }
}

export const config ={
    matcher:[
        "/api/auth/signin",
        "/api/auth/signout",
        "/api/auth/verify",
        "/api/auth/callback",
        "/api/auth/session",
        "/api/auth/providers",
        "/api/auth/csrf"
    ]
}