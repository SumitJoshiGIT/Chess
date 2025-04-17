import {Hono} from 'hono';
import {handle} from 'hono/vercel';
import {z} from 'zod';
import {rateLimiter} from 'hono-rate-limiter';
import getRedis from '@/server/redis';
import { error } from 'console';
import orm from '@/lib/orm';

const app=new Hono().basePath('/api/game')
const redis=getRedis()

const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId");
const outputSchema = z.object({
          
})

app.use(rateLimiter({
        windowMs:60000,
        limit:10,
        standardHeaders: 'draft-6',
        keyGenerator: (c) => c.req.header('Authorization') || ''
      
}))

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
    const pageResult = z.number().safeParse(Number(c.req.param('page')));
    
    if (!(id.success && pageResult.success)) {
      return c.json({ success: false, error: "Invalid parameters" }, 400);
    }

    const data = await orm.game.findMany({
          where: {
              id: c.req.param('id')
          },
          skip: pageResult.data * 10,
          take: 10
    });

    if (data) {
          await redis.hset(`game:${id}`, JSON.stringify(data), 'EX', 60);
          return c.json(data);      
    } else {
          return c.json({ success: false, error: "Game not found" }, 422);
    }
})


export default handle(app);