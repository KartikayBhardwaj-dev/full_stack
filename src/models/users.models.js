import mongoose,{Schema} from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
const userSchema = new Schema(
    {
        username: {
            type:String,
            required:true,
            lowercase:true,
            trim:true,
            unique:true,
            index:true
        },
        email: {
            type:String,
            required:true,
            lowercase:true,
            trim:true,
            unique:true
        },
        fullName: {
            type:String,
            required:true,
            trim:true,
            index:true
        },
        avatar: {
            type:String,
            required:true,
        },
        coverImage: {
            type:String,
        },
        password:{
            type:String,
            required:[true,"Pasword is required"]
        },
        watchHistory:{
            type:Schema.Types.ObjectId,
            ref:"Video"
        },
        refershToken:{
            type:String
        }
    
    },{timestamps:true}
)
userSchema.pre("save",async function(next){
    if (this.isModified("password")){
        this.password = await bcrypt.hash(this.password,10)
    }
    else return next()
})
userSchema.method.isPassWordCheck = async function(password){
    return await bcrypt.compare(password,this.password)
}
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}
export const User = mongoose.model("User",userSchema)