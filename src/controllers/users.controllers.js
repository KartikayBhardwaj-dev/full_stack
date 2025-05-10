import { handler } from "../utils/handlers.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/users.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

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
    console.log(avatar)
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
console.log(isPasswordValid);

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

const refreshAccessToken = handler(async(req,res)=>{
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



// updating controllers 
// updating password
const updateCurrentPassword = handler(async(req,res)=>{
    // access password by body
    log
    const {oldPassword,newPassword} = req.body

    // use auth middleware and there giving req.user from where we can find user
    const user = await User.findById(req.user._id)

    // check oldPassword given is right or wrong acc to user saved in db
    const isPasswordValid = await user.isPassWordCheck(oldPassword)

    // is is password not valid
    if (!isPasswordValid) {
        throw new ApiError(400,"Invalid old Password")
    }

    //  now if old Password matches then save new password
    user.password = newPassword
    await user.save({validateBeforeSave: false})

    // send response when password is saved

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Password changed successfully"
        )
    )
})

// get current user
const getCurrentUser = handler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})


// change details text based
const updateCurrentDetails = handler(async(req,res)=>{
    const {fullName,email} = req.body
    // check if field are not empty
    if (!(fullName || email)) {
        throw new ApiError(400,"all Fields are required")
    }

    // now get the user from db using auth middleware req.user anf then chamge
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { // using set to set new fields 
                fullName, // we can use also fullName: fullName
                email
            }
        },
        {new: true} // setting new values
    ).select("-password")


    // now send the response
    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {user},
            "User Details Changed Successfully"
        )
    )
})

// change Avatar file
const updateAvatarFile = handler(async(req,res)=>{
    // get the file path from multer using req.file not req.files because we want one path avatar
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400,"Avatar file is required")
    }
    // hit a db call to update file path 
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")


    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {user},
            "Avatar file changed successfully"
        )
    )

})

// update cover image

const updateCoverImageFile = handler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment
    // deleting the image local path 
   

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})

// WRITTING PIPELINES

// fetching user channel details
const getUserChannelProfile = handler(async(req,res)=>{
    // when user hit url we can get details from there
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400,"Username Is missing")
    }

    // aggregate pipelines to count subscriber count and channel count 
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {   // lookup to find subscribers
            $lookup: {
                from: "subscriptions",
                localField: "_id",    // id dekhke
                foreignField: "channel",  // select channel 
                as: "subscribers"
            }
        },
        {
            // lookup  to find channel 
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            // addfield operator to add both filds subscriber and subscribed to 
            $addFields: {
                // here we just make variables and count the things which want to 
                subscriberCount: {
                    $size: "$subscribers"
                },
                channelSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                // here checking if user is logged in so if user subscribed to channel or not
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id,"$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            },
            // project oprator projects only selected value
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1



            }
        }
    ])
    if(!channel?.length){
        throw new ApiError(400,"channel does not exists")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            channel[0],
            "user channel fetched successfully"
        )
    )
})

// fetching watch history details

const getWatchHistory = handler(async(req,res)=>{
    //  to find watch histroy we need to get user
    // we need to use match operator to check wheather id coming from frontend is same as in db or not
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id) // to make sure our string coming in req converted into mongo db objectid because pipelines code directly computed by mongo db 

            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                // nested pipeline because video model has field owner which referes user so to make owner field
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner", // local field me user ko kya bolte h owner
                            foreignField: "_id", // foreign field (user) me usko _id ,
                            as: "owner",
                            // nested pipeline to use project operator to project at owner
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        } 
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    console.log(user);
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})


export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    updateCurrentPassword,
    getCurrentUser,
    updateCurrentDetails,
    updateAvatarFile,
    updateCoverImageFile,
    getUserChannelProfile,
    getWatchHistory
}