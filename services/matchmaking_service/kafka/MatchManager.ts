import {Kafka} from 'kafkajs'
import Redis from 'ioredis';
const kafka = new Kafka({ brokers: [process.env.BROKERS] });
const redis = new Redis(process.env.REDIS_URL);
const producer = kafka.producer({groupID:'matchmaking'});
const consumer = kafka.Consumer({groupId:'games'});

export default class MatchManager{
        
    constructor(){}

    async function forwardAcknowledgement({from,to,gameID}){
        await producer.connect();
        redis.get(gameID,(err,res)=>{
            if(err){console.error(err);}                
        })
        await producer.send({
            topic: 'games',
            messages: [
                key:gameID,
                { value: {from:from,to:to}}
            ]
        });

        await producer.disconnect();

    }

    async function handler({topic,partition,message}){
               const key=message.key.toString();
               const value=JSON.parse(message.value.toString());
                          

    }
 
    async function consumeMatchmakingRequest(){
                consumer.connect();
                consumer.subscribe({topic:'matchmaking'});
                consumer.run({
                    foreachMessage: async ({topic,partition,message}) => {
                               const cost =  message.value.elo; 
                               redis.zadd('players',cost,[message.value.userID,message.userID.type])
                               redis.hset(message.value.)  

                    }
                })
            
    }
 
    async function 
}