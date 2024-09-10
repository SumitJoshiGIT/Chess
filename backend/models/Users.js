const mongoose = require('mongoose')


const UsersModel=mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    games:{
        type:[mongoose.Types.ObjectId],
        ref:'games',
    }
  })

module.exports=UsersModel;




















module.exports=UsersModel;