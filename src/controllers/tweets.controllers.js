import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {handler} from "../utils/handlers.js"

const createTweet = handler(async (req, res) => {
    const userId = req.user._id
    const {content} = req.body
    
    if(!content){
        throw new ApiError(400,"Please Provide the Content")
    }
    const tweet = await Tweet.create({
        content,
        owner: userId
    })

    if(!tweet){
        throw new ApiError(400,"Failed to create Tweet")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            tweet,
            "Created Tweet Successfully"
        )
    )
})

const getUserTweets = handler(async (req, res) => {
    const userId = req.user._id
    const { page = 1 , limit = 10 } = req.query

    if(!userId || !isValidObjectId(userId)){
        throw new ApiError(400,"Missing Or Invalid Id");
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $sort: {
                createdAt: -1
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                $owner: {
                    $first: "$owner",
                },
            },
        },
        {
            $project: {
                owner: 1,
                content: 1,
                createdAt: 1,
            },
        },
        {
            $skip: (page - 1) * limit,
        },
        {
            $limit: parseInt(limit)
        },
    ])

    if(!tweets){
        throw new ApiError(400,"Failed To Fetch Tweets")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            tweets[1],
            "Tweets Fetched Successfully"
        )
    )
})

const updateTweet = handler(async (req, res) => {
    const userId = req.user._id
    const tweetId = req.params

    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400,"Missing or Invalid id")
    }

    const content = req.body
    if(!content){
        throw new ApiError(400,"Please Provide Tweet")
    }

    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new ApiError(400,"No Tweet Found")
    }

    if(!tweet.owner.equals(userId)){
        throw new ApiError(403,"You are Not Allowed to Update tweet")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content
            },
        },
        {
            new: true
        }
    )
    if(!updatedTweet){
        throw new ApiError(400,"Failed To Update Tweet")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedTweet,
            "Updated Tweet Successfully"
        )
    )




})

const deleteTweet = handler(async (req, res) => {
    const userId = req.user._id
    const tweetId = req.params
    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400,"Missing or invalid Id")
    }
    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new ApiError(400,"Tweet Not found")
    }
    if(!tweet.owner.equals(userId)){
        throw new ApiError(403,"You are not Allowed to delete tweet")
    }
    const deletedTweet = await Tweet.findByIdAndDelete(tweetId)
    if(!deletedTweet){
        throw new ApiError(400,"failed to delete the tweet")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            deletedTweet,
            "Tweet Deleted Successfully"
        )
        
    )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}