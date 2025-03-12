import Redis from 'ioredis'
const client=new Redis({
        host:process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT)
});

client.on('error',function(err){console.log("client error",err)});
client.on('connect',function(){console.log("client connected")});

export async function LimitedTransactionRetrieval(key:string,delZero:boolean=false){
     const result = await client.multi()
                                .get(key)
                                .decr(`${key}:count`)
                                .get(key)
                                .exec();
     if (result && delZero && result[1][1] === 0) {
         await client.multi().del(key).del(`${key}:count`).exec();
     }
     
     return result ? result.map(res => res[1]) : [];
}


export async function LimitedTransactionCreation(key: string, value: string, ttl: number, count: string) {
    const result = await client.multi()
                               .set(key, value, 'EX', ttl)
                               .set(`${key}:count`, count, 'EX', ttl)
                               .exec();
}

export default function getRedis(){
    return client;
}
