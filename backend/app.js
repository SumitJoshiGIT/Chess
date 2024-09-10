const express=require('express')
const {createServer} =require('http')
const cookieParser = require('cookie-parser')
const session=require('express-session')
const csrf=require('csurf');
const multer=require('multer');
const mongoStore=require('connect-mongo')
const authRouter=require('./routes/auth/auth')
const path=require('path');
const cors=require('cors');
require('dotenv').config()
const {Server}=require('socket.io');
const redis=require('ioredis');
const {onConnection,onDisconnection}=require('./routes/api/socketEvents');
const mongoose=require('mongoose')

const io=new Server(server,{cors:{origin:'*'}})
const Cache=new redis.Redis({
    host:process.env.REDIS_HOST,
    port:process.env.REDIS_PORT,
    db:1
})


games.on('connection',()=>{})

const QueueSet=new Set();
const PlayerQueue={
    'silver':[],
    'gold':[],
    'diamond':[],
    'bronze':[],
    'untiered':[]
};

async function onAvailable(){

    
}


app.post('/findMatch', function(req, res){
       
       const {rank,user}=req.body;
       MessageQueue[rank].push(user);
       

})

app.post('updateProfile')
const session=session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false,
    store:mongoStore.create({
        mongoUrl:process.env.MONGODB_URI
    })
})

const app=express();
io.on('connection',onConnection);
io.on('disconnection',onDisconnection)

app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(express.text());

app.use(cors({ cors: { origin: "*" } }));
app.use(express.static(path.join(__dirname,'client','dist')));
app.use(express.static(path.join(__dirname,'public')))