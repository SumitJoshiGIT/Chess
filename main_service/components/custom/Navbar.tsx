"use client"
import React from 'react'
import { NavigationMenu, NavigationMenuContent } from '@radix-ui/react-navigation-menu'
import { NavigationMenuItem } from '@radix-ui/react-navigation-menu'
import { NavigationMenuTrigger } from '@radix-ui/react-navigation-menu'
import { NavigationMenuLink } from '@radix-ui/react-navigation-menu'
import { NavigationMenuList } from '@radix-ui/react-navigation-menu'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import  {useRouter} from 'next/navigation'
import {useSession} from 'next-auth/react'
import Auth from './Auth'
import { signOut } from 'next-auth/react'
import DrawerProvider from './DrawerProvider'
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function Navbar() {
    const router=useRouter();
    const {data:session}=useSession();
    
    function navigateTo(dest:string){router.push(dest)}
    return (
    <>
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center"
        >
          <Menu color="black" className="w-7 h-7" />
        </Button>
      </SheetTrigger>
    
      <SheetContent side="left" className="w-64 bg-white text-black flex flex-col items-start py-8">
        <Button
          variant="ghost"
          className="mb-4 w-full justify-start "
          onClick={() => navigateTo('/')}
        >
          Home
        </Button>
        <Button
          variant="ghost"
          className="mb-4 w-full justify-start "
          onClick={() => navigateTo('/games/lessons')}
        >
          Play
        </Button>
        <Button
          variant="ghost"
          className="mb-4 w-full justify-start "
          onClick={() => navigateTo('/user/games')}
        >
          Learn
        </Button>
        <Button
          variant="ghost"
          className="mb-4 w-full justify-start "
          onClick={() => navigateTo('/user/profile')}
        >
          Profile
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start "
          onClick={() => navigateTo('/games/friends')}
        >
          Friends
        </Button>
      </SheetContent>
    </Sheet>

  <div className='w-full h-20'>
    
  <div className='p-2 float-right'>
    
    {(session)?<Button onClick={()=>signOut({callbackUrl:'/'})}>Signout</Button>:
    <div>
        <DrawerProvider className='mr-2'   tag="SignIn">
            <Auth header="Welcome Back" type={0}/>
        </DrawerProvider>
        <DrawerProvider  tag="Signup" >
            <Auth header="SignUp" type={1}/>   
        </DrawerProvider>
    </div>}
    </div>
  </div>
  </>
  )
}
