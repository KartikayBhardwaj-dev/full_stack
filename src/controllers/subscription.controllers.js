import mongoose,{isValidObjectId} from "mongoose";
import { handler } from "../utils/handlers.js";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { Subscription } from "../models/subscription.models.js";



const toggleSubscription = handler(async (req,res) =>{
    const {channelId} = req.params
    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400,"Missing or Invalid Channel Id")
    }
    const userId = req.user._id
    if(!userId || !isValidObjectId(userId)){
        throw new ApiError(400,"Missing UserID")
    }
    const subscribed = await Subscription.findOne({
        channel: channelId,
        subsriber: userId
    })
    if(!subscribed){
        const subscribe = await Subscription.create({
            channel: channelId,
            subsriber: userId
        })
        if(!subscribe){
            throw new ApiError(400,"Error while subscribing to the channel")
        }
        return res
    .status(200)
    .json(new ApiResponse(
        200,
        {subscribed: true},
        "channel subscribed"
    ))
    }
    
    const unsubscribe = await Subscription.findByIdAndDelete(subscribed._id)
    if(!unsubscribe){
        throw new ApiError(400,"error while unsubscribing the channel")
    }
    return res
    .status(200,new ApiResponse(
        200,
        {subscribed: false},
        "channel Unsubscribed"
    ))
    
    
})

const getUserChannelSubscriber = handler(async(req,res)=>{
const {channelId} = req.params
if(!channelId || !isValidObjectId(channelId)){
    throw new ApiError(400,"Missing or invalid channel id")
}
const subscriberList = await Subscription.aggregate([
    {
        $match: {
            channel: new mongoose.Types.ObjectId(channelId),
        },
    },
    {
        $group: {
            _id: "$channel",
            subscribersCount: {
                $sum: 1
            },
        },
    },
    {
        $project: {
            subscriberCount: 1,
            channel: 1
        }
    }
])
const subscriberCount = subscriberList.lenght > 0 ? subscriberList[0] : 0
return res
.status(200)
.json(
    new ApiResponse(
        200,
        {subscriberCount},
        "Subscriber fetched successfully"
    )
)
})

const getSubscribedChannels = handler(async(req,res)=>{

    const {subscriberId} = req.params
    if(!subscriberId || !isValidObjectId(subscriberId)){
        throw new ApiError(400,"Missing or invalid id")
    }
    const totalCount = await Subscription.countDocuments({
        subscriber: new mongoose.Types.ObjectId(subscriberId)
    })

    const channelList = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.types.ObjectId(subscriberId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                channelDetails: {
                    $first: "$channelDetails"
                },
            },
        },
    ]);
    if(!channelList?.length){
        throw new ApiError(404,"No subscriber Found")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {totalCount,channels: channelList},
            "subscribed accounts fetched successfully"
        )
    )

})

export {
    toggleSubscription,
    getSubscribedChannels,
    getUserChannelSubscriber

}