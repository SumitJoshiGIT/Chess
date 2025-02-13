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
import { Card } from '../ui/card'
export default function Navbar() {
    const router=useRouter();
    const {data:session}=useSession();
    
    function navigateTo(dest:string){router.push(dest)}
    return (
    <>
    <NavigationMenu className='m-2 absolute  rounded-lg w-fit'>
    <NavigationMenuList>
      <NavigationMenuItem>
         
         <NavigationMenuTrigger className='w-10 rounded-md flex items-center justify-center h-10 p-0 bg-black'>
                    <Menu color='white' className='w-7 h-7'/>
            </NavigationMenuTrigger>
        
        <NavigationMenuContent className='flex-col w-auto'>

          <div className='m-2 ml-0'><Button onClick={()=>navigateTo('/')}className='w-10 h-10 bg-blue-400'>Play</Button>
          </div>
          <div className='m-2 ml-0'><Button onClick={()=>navigateTo('/')}className='w-10 h-10 bg-blue-400'>Learn</Button>
          </div>
          <div className='m-2 ml-0'><Button onClick={()=>navigateTo('/')}className='w-10 h-10 bg-blue-400'>Profile</Button>
          </div>
          <div className='m-2 ml-0'><Button onClick={()=>navigateTo('/')}className='w-10 h-10 bg-blue-400'></Button>
          </div>
        </NavigationMenuContent>
        
       </NavigationMenuItem>
    </NavigationMenuList>
    
  </NavigationMenu>
  <div className='w-full h-20'>
    
  <div className='p-2 float-right'>
    
    {(session)?<Button onClick={()=>navigateTo('/auth/signout')}>Signout</Button>:
    <div>
        <Button onClick={()=>navigateTo('/auth/signin')} className='mr-2'>Login</Button>
        <Button onClick={()=>navigateTo('/auth/signup')}>Signup</Button>
    </div>}
    </div>
  </div>
  </>
  )
}
