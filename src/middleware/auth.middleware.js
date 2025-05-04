import { handler } from "../utils/handlers.js";
import jwt from "jsonwebtoken"
import { User } from "../models/users.models.js";
import { ApiError } from "../utils/ApiError.js";


export const verifyJWT = handler( async(req,res,next) => {
    try {
        // first we have to acces token from req (given by user) or from header (made by jwt in form of Bearer "token")
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
        console.log(`recieved token: ${token}`);
    
        // if token not recieved
        if(!token){
            throw new ApiError(401,"Unauthorised Access")
        }
    
        // verifying our token using jwt 
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        // now using decoded token find the user
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(401,"Invalid Access Token")
        }
    
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid access token")
    }    
})