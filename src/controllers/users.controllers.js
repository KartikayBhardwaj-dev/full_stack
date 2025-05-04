import { handler } from "../utils/handlers.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/users.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

// creating general method to generate access and refresh token 
const generateAccessTokenAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        return { accessToken,refreshToken }
    } catch (error) {
        throw new ApiError(500,"something went wrong while generating access and refresh token")
    }
}

// REGISTER USER
const registerUser = handler( async(req,res) =>{
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
    const {username,email,fullName,password} = req.body
    // console.log(username,email);
    if (
        [username,email,fullName,password].some((field) => {
            field?.trim() === ""
        })
    ) {
        throw new ApiError(400,"all fields are required")

    }
    const existedUser = await User.findOne({
        $or : [{email},{username}]
    })
    if(existedUser){
        throw new ApiError(409,"user with this email and username already exists")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }
    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password

    })
    const createdUser = await User.findById(user._id).select(
        "-password -refershToken"
    )
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }
    return res.status(201).json(
        new ApiResponse(200,createdUser,"user register")
    )
} )

//  LOGIN USER

const loginUser = handler( async(req,res) =>{
    // req body -> data
    // username or email
    // find the user
    // password check
    // access and referesh token
    // send cookies

    // taking data from req
    // console.log("hello");
    console.log(`request body : ${req.body}`);
        
    const {username,email,password } = req.body
console.log("hello");

    // checking req should not be empty
    if(!(username || email)){
        throw new ApiError(400,"Username Or email Required")
    }

    // finding user from database
    const existedUser = await User.findOne({
        $or: [ {username} , {email} ]
    })

    // checking if user not found in db then not found
    if(!existedUser){
        throw new ApiError(404,"User not found")
    }
console.log(existedUser);


    // if found then check password isPassWordCheck function returns boolean 
    const isPasswordValid = await existedUser.isPassWordCheck(password) // await because db is in another continent
console.log("password");

    // if isPasswordValid false then user creaditials wrong
    if (!isPasswordValid){
        throw new ApiError(401,"user crediatials wrong")
    }

    // generating access and refresh token
    const { accessToken,refreshToken } = await generateAccessTokenAndRefreshToken(existedUser._id)
    
    // access loginuser from db call
    const loggedInUser = await User.findById(existedUser._id).select("-password -refreshToken")

    // create cookie 
    const options = {
        httpOnly: true, // edited by the server only 
        secure: true
    }
    console.log("user logged in successfully")
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                existedUser: loggedInUser, accessToken , refreshToken
            },
            "User logged in successfully"
        )
    )
})

// LOGOUT USER

const logoutUser = handler( async(req,res) => {
    User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    console.log("user logged out ");
    
    return res
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(
        new ApiResponse(
            200,
            {},
            "user logged out"
        )
    )
})

// refreshing the access token

const refershAccessToken = handler(async(req,res)=>{
    // access the resfresh token from cookies or body
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401,"unauthorised access")
    }
    try {
        // now verify incoming token 
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        )
        // finding the uses using token
        const user = User.findById(decodedToken?._id)
        // check user is or not
        if(!user){
            throw new ApiError(401,"invalid access token")
    
        }
    
        // checking user refresh token and incoming refresh token 
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401,"refresh token is expired")
        }
    
        //  now that they are equal then genrate new one for user 
        const {accessToken,refreshToken} = await generateAccessTokenAndRefreshToken(user._id)
    
        // create cookies
        const options ={
            httpOnly: true,
            secure: true
        }
    
        // return res
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: refreshToken},
                "Access Token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})
export { 
    registerUser,
    loginUser,
    logoutUser 
}