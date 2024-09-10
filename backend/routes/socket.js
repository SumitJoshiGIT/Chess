
const redis=require('ioredis');
const Users=require('../models/Users');
const Messages=require('../models/Messages');
const {Redis}=require('ioredis');

const users=new Redis({
    host:process.env.REDIS_HOST,
    port:process.env.REDIS_PORT,
    db:0
})
 

const games=new Redis({
    host:process.env.REDIS_HOST,
    port:process.env.REDIS_PORT,
    db:0
})

async function onAvailable(){
                          
    
}
async function onConnection(socket){
            const user=await Users.findById(socket.session.user_id);
            let game=null;
            socket.on('joinQueue',(data)=>{
                const game_id=data.game_id
                if(games.has(game_id)){
                    const game=games.get(game_id)
                    game.addPlayer(socket.id,data.username)
                    socket.join(game_id)
                    socket.emit('game_started',game)
                }else{

                    socket.emit('game_not_found')
                }
            })
            socket.on('move',([x,y,x1,y1])=>{
                if(game){
                    (game.move(x,y,x1,y1))?
                        socket.emit('ack',[x,y,x1,y1])
                    :socket.emit('nak',[x,y,x1,y1])
                }
                else socket.emit('error','game not found')
            })
            socket.on('leaveQueue',(data)=>{

           
            })
            socket.on('message',(data)=>{

            })  
           

}

function onDisconnection(socket){




}


module.exports={onConnection,onDisconnection}