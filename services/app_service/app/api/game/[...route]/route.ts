import {Hono} from 'hono';
import {handle} from 'hono/vercel';
import getORM from '@/lib/orm';
import {z} from 'zod';
import {limiter} from 'hono/limiter';
import getRedis from '@/src/server/redis';
import { error } from 'console';

const app=new Hono().basePath('/api/game')
const orm=getORM()
const redis=getRedis()
const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId");
const outputSchema = z.object({
          
})

app.use(limiter({
        windowMs:60000,
        limit:10,
        standardHeaders:true,
        legacyHeaders:false,
        onLimitReached:(c)=>{
            return c.json({success:false,error:"Rate limit exceeded"})
        }
      
}))


//
app.get('/:id',async (c)=>{
      const id=objectIdSchema.safeParse(c.req.param('id'));
      if(!id){
        return c.json({ success: false, error: "Invalid id" }, 400);
      }

      const data=await orm.game.findUnique({
            where:{
            id:c.req.param('id')
            }
      });
      
      if (data) {
            await redis.hset(`game:${id}`, JSON.stringify(data), 'EX', 60);
            return c.json(data);      
      } else {
            return c.json({ success: false, error: "Game not found" }, 422);
      }
})

app.get('/:id/:page',async (c)=>{
    const id=objectIdSchema.safeParse(c.req.param('id'));
    const page=z.number().safeParse(c.req.param('page'));
    
    if(!(id&&page)){
      return c.json({ success: false, error: "Invalid parameters" }, 400);
    }

    const data = await orm.game.findMany({
          where: {
              id: c.req.param('id')
          },
          skip: page * 10,
          take: 10
    });

    if (data) {
          await redis.hset(`game:${id}`, JSON.stringify(data), 'EX', 60);
          return c.json(data);      
    } else {
          return c.json({ success: false, error: "Game not found" }, 422);
    }
})

// 

app.get("/")
