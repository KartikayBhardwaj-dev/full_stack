import dotenv from "dotenv"
import mongoose from "mongoose";
import connectDB from "./db/index.js";
import { DB_NAME } from "./constants.js";

dotenv.config({
    path:"./env"
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 3000,()=>{
        console.log(`server is running at ${process.env.PORT}`);
        
    })
})
.catch((error)=>{
    console.log(`MONGO DB connection failed: ${error}`);
    
})
