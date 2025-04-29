import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors"

const app = express()
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true    
}))

app.use(express.json({limit:"16kb"})) // when data comes from json
app.use(express.urlencoded({
    extended:true,
    limit:"16kb"
})) // data comes from urls 
app.use(express.static("public"))
app.use(cookieParser())


//  import routes

import userRouter  from "./routes/users.routes.js";

app.use("/api/v1/users" , userRouter)



export  { app }