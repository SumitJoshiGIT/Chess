import {Hono} from 'hono';
import {handle} from 'hono/vercel';
import orm from '@/lib/orm';
import {z} from 'zod';
import {limiter} from 'hono/limiter';
import getRedis from '@/server/redis';
import { error } from 'console';
import { useSession } from 'next-auth/react';

const app=new Hono().basePath('/api/user')
const redis=getRedis()
const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId");


app.use(limiter({
        windowMs:60000,
        limit:10,
        standardHeaders:true,
        legacyHeaders:false,
        onLimitReached:(c)=>{
            return c.json({success:false,error:"Rate limit exceeded"})
        }
      
}))


app.get('/profile',async (c)=>{
      
      if(!id){
        return c.json({ success: false, error: "Invalid id" }, 400);
      }

      const data=await orm.user.findUnique({
            where:{
            id:c.req.param('id')
            }
      });
      
      if (data) {
            await redis.hset(`game:${id}`, JSON.stringify(data), 'EX', 60);
            return c.json(data);      
      } else {
            return c.json({ success: false, error: "Game not found" }, 404);
      }
})

app.get('/profile/:id',async (c)=>{
      const id=objectIdSchema.safeParse(c.req.param('id'));
      if(!id){
        return c.json({ success: false, error: "Invalid id" }, 400);
      }

      const data=await orm.user.findUnique({
            where:{
            id:c.req.param('id')
            }
      });
      
      if (data) {
            await redis.hset(`game:${id}`, JSON.stringify(data), 'EX', 60);
            return c.json(data);      
      } else {
            return c.json({ success: false, error: "Game not found" }, 404);
      }
})

app.get('/friends/:page',async (c)=>{
      
})


const bodySchema=z.object({
      password:z.string().min(8),
      username:z.string().email(),
      name:z.string().min(3),
      country:z.string().min(3)
})

app.post('/profile/update',async (c)=>{
      const validity=bodySchema.safeParse(c.req.body);
      if(!validity)return c.json({success:false,error:"Invalid Request"})     
      const req=await useSession({req:c.req})
      const data=req.data?.user
      if(data){
            
            const update=await orm.user.update({
                        where:{
                              id:data.id
                        },
                        data:{
                              ...c.req.body
                        }
            })
            return c.json({success:true,data:update})            
      }
      else return c.json({success:false,error:"User not found"})
})
export const GET=handle(app)
export const POST=handle(app)