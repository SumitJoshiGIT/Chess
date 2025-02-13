import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
export default function UserDashBoard() {
  return (
    <div className='main-container p-2'>
      <Card>
        <div className='flex justify-center'>
          <h1 className='text-2xl'>User Dashboard</h1>
        </div>
        <div className='flex '>
           <Button>1</Button>
           <Button>1</Button>
           <Button>1</Button>
           <Button>1</Button>
        
        </div>
        
      </Card>
    </div>
  )
}

