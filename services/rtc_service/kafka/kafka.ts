import kafka from 'kafkajs'
import { v4 as uuidv4 } from 'uuid';

const serverID=`ext_server_${uuidv4()}`;
const kafka = new kafka({ brokers: [process.env.BROKERS] });
const producer = kafka.producer({groupID:'matchmaking'});
const consumer = kafka.Consumer({groupId:'games'});

export default class GameManager{
          id:string;
          constructor(){
            this.id = uuidv4();
          }

          async sendMatchmakingRequest({userID:string,type:number}){
                    await producer.connect();
                    await producer.send({
                              topic: `matchmaking`,
                              messages: [ 
                                         {  key:serverID,
                                            value: {id:userID,type:type}}
                              ]
                    });
                    await producer.disconnect();
          }
          
          async sendMoves({playerID,move}:{playerID:string,move:{from:string,to:string}}){
                    await producer.connect();
                    await producer.send({
                              topic: 'games',
                              messages: [
                                         key:gameID,
                                         { value: {playerID:playerID,from:move.from,to:move.to}}
                              ]
                    });
                    await producer.disconnect();
          }

          async consumeMatches(){
                       await consumer.connect();
                       await consumer.subscribe({topic:`matchmaking`,groupId:'players'});
                       await consumer.run({
                                     eachMessage: async ({topic, partition, message}) => {
                                              const key = message.key.toString();
                                              const value = JSON.parse(message.value.toString());
                                              
                                              const p1=value.p1;
                                              const p2=value.p2;
                                    }
                     });
          }


};