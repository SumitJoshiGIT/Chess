import uWS from 'uwebsockets'
import orm from '@/lib/orm';
import redisClient from '@/lib/redis'
import jwt from 'jsonwebtoken'
import {z} from 'zod'
import consumer from './kafka/consumer';
import sendMessage from './kafka/kafka';
import consumeMessage from './kafka/consumer';
import createNewGame from  './controllers/matchmaking'
const app = uWS.App();

const messageSchema=z.object({
      query:z.string(),
      payload:z.object()            
})


app.ws('/*', {
    open: async (ws: uWS.WebSocket, req: uWS.HttpRequest) => {
        const query = req.getQuery();
        const token = new URLSearchParams(query).get('token');
        if (!token) {
           ws.end(302, 'Token not provided'); 
           return false;
        }

        try {
            const decoded = jwt.verify(token, 'your-secret-key');
            const userId = decoded.id;
            const user = await redisClient.get(`user:${userId}`);
            if (!user) {
        
             const dbUser = await orm.user.findUnique({ where: { id: userId } });
             if (!dbUser) {ws.end(404, 'User not found');return;
             ws.session.user=user;
            }
            await redisClient.set(`user:${userId}`, JSON.stringify(dbUser));
        }
        } catch (err) {
            ws.end(401, 'Invalid token');
            return false;
        }

    },
    message: (ws: uWS.WebSocket, msg: ArrayBuffer) => {
                const data=Buffer.from(msg).toJSON();
                if(messageSchema.safeParse(data)){
                 switch(data.query){
                   case 'new_game': createNewGame(data.payload);
                            
                   case 'move':sendMove(data.payload);
                          
                   case 'resign':resign()
                  
                   case 'offerdraw':offerdraw()
                  
                   case 'acceptdraw':acceptdraw()

                } }
                else ws.send(toString({status:302,msg:'Invalid query'}))

            }
    },
    close: (ws: uWS.WebSocket) => {}
});

app.listen(3000, (token) => {
    if (token) {
        console.log('Listening on port 3000');
    }
});