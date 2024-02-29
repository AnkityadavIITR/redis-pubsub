import Redis from "ioredis"
import fastify from "fastify"
import fastifyCors from "@fastify/cors"
import fastifySocketIO from "fastify-socket.io"
import dotenv from 'dotenv'

dotenv.config()

const PORT=process.env.PORT || 4000
const HOST=process.env.host || `0.0.0.0`
const cors_origin=process.env.CORS_ORIGIN || "http://localhost:3000"
const UPSTASH_REDIS_URL=process.env.UPSTASH_REDIS_URL || "redis://127.0.0.1:6379"

const CONNECTED_COUNT_CHANNEL="chat-connection-cnt";


if(!UPSTASH_REDIS_URL){
    console.log("error in redis");
    console.log(UPSTASH_REDIS_URL);
    process.exit(1);
}

//CREATING REDIS instance for publish
const pub=new Redis(UPSTASH_REDIS_URL);

//CREATING REDIS instance for subscribe
const sub=new Redis(UPSTASH_REDIS_URL);

async function buildserver() {
    const app=fastify();

    await app.register(fastifyCors,{
        origin:cors_origin,
    })

    const currentCnt=pub.get(CONNECTED_COUNT_CHANNEL);
    

    if(!currentCnt){
        pub.set(CONNECTED_COUNT_CHANNEL,0);
    }

    await app.register(fastifySocketIO);

    app.io.on('connection',async(io)=>{
        console.log("client connected");

        await pub.incr(CONNECTED_COUNT_CHANNEL)
        
        
        io.on('disconnect',async()=>{
            await pub.decr(CONNECTED_COUNT_CHANNEL)
            console.log("disconnected")
        })
    })

    app.get("/healthcheck",()=>{
        return {
            status:"ok",
            port:PORT
        }
    })

    return app;
}

async function  main() {
    const app=await buildserver();
    try{
        await app.listen({
            port:PORT,
            host:HOST,
        })
        console.log(`server started at http://${HOST}:${PORT}`)
    }catch(e){
        console.log(e);
        process.exit(1);
    }
}
main()