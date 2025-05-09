import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async ()=>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.DATABASE_URL}/${DB_NAME}`)
    } catch (error) {
        console.log(`MongoDB connection failed:${error}`);
        throw error
        
    }
}

export default connectDB