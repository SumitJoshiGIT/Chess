import {Hono} from 'hono';
import {handle} from 'hono/vercel';
import orm from '@/lib/orm';
import {z} from 'zod';
import {rateLimiter} from 'hono-rate-limiter';
import getRedis from '@/server/redis';
import { error } from 'console';
import { useSession } from 'next-auth/react';

const app=new Hono().basePath('/api/user')
const redis=getRedis()

const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId");
app.use(rateLimiter({
        windowMs:60000,
        limit:10,
        standardHeaders: 'draft-6',
        keyGenerator: (c) => c.req.header('Authorization') || ''
      
}))

app.get('/profile/:id',async (c)=>{
      const rawId = c.req.param('id');
      // Accept both ObjectId and string IDs
      let data;
      // If your DB only uses string IDs, you can skip the ObjectId check entirely
      if (/^[a-fA-F0-9]{24}$/.test(rawId)) {
        // Looks like an ObjectId
        data = await orm.user.findUnique({
          where: { id: rawId }
        });
      } else {
        // Use as string
        data = await orm.user.findUnique({
          where: { id: rawId }
        });
      }
      
      if (data) {
            await redis.hset(`game:${rawId}`, JSON.stringify(data), 'EX', 60);
            return c.json(data);      
      } else {
            return c.json({ success: false, error: "User not found" }, 404);
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

export const GET=handle(app)
export const POST=handle(app)