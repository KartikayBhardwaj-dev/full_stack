// imports statements
import mongoose,{isValidObjectId} from "mongoose";
import { handler } from "../utils/handlers.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Video } from "../models/video.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";


// functions

// get all videos for the user 

const getAllVideos = handler(async(req,res)=>{
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    
    const matchStage = {
        isPublished: true,
        title: {$regex: query , $options: "i"}
    }

    const totalVideos = await Video.countDocuments(matchStage)

    const Pipeline = [
        {$match: matchStage},
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullname: 1,
                            username: 1,
                            avatar: 1
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                },
            },
        },
        {
            $sort: {
                [sortBy]: sortType === 'asc' ? 1 : -1
            },
        },
        { $skip: (parseInt(page) - 1) * parseInt(limit) },
        { $limit: parseInt(limit) },

    ]

    const videos = await Video.aggregate(Pipeline)
    if(!videos?.length){
        throw new ApiError(400,"Video Not Found")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
            videos,
            totalVideos,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalVideos / limit),
            },
            "Videos Fetched Successfully"
        )
    )


})

// publish a video
const publishVideo = handler(async(req,res)=>{
    // get title and description 
    const {title,description} = req.body

    if(
        [title,description].some((field)=>{
            field?.trim() === ""
        })
    ){
        throw new ApiError(400,"title and description are required")
    }




    // get video , upload on cloudinary
    // getting this from multer
    const videoLocalPath = req.files?.videoFile[0]?.path
    console.log(`video local path ${videoLocalPath}`);
    
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path
    console.log(`thumbnail local path ${thumbnailLocalPath}`);
    


    // checking path is there or not
    if (!(videoLocalPath || thumbnailLocalPath)) {
        throw new ApiError(400,"Video & thumbnail file is required")
    }

    // if local path exixts upload it on cloudinary
    const videoFile = await uploadOnCloudinary(videoLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    console.log(`video file path ${videoFile}`);
    console.log(thumbnail);
    
    
    // now we have to get the duration of video from cloudinary
    const duration = videoFile.duration
    console.log(duration);
    
    if(!duration){
        throw new ApiError(400,"duration is missing")
    }
    if (!(videoFile || thumbnail)) {
        throw new ApiError(400,"Video and thumbnail file is missing")
    }

    // upload on db
    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title,
        description,
        duration
    })

    // return response
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Video uploaded successfully"
        )
    )
    

})

// get a video by id 
const getVideoById = handler(async(req,res)=>{
    const {videoId} = req.params
    console.log(videoId);
    
    if (!videoId) {
        throw new ApiError(400,"ID missing")
    }

    // find video by its id
   
    // const objectId = new mongoose.Types.ObjectId(videoId)
    // console.log(objectId);
    
    const video = await Video.findById(videoId)
    if(!video){
     throw new ApiError(404,"Video not Found")
    }
 
    return res
    .status(200)
    .json(
     new ApiResponse(
         200,
         video,
         "Video fetched successfully"
     )
    )
   

})

// update video details
const updateVideo = handler(async(req,res)=>{
    const {videoId} = req.params
    
    if (!videoId) {
        throw new ApiError(400,"ID missing")
    }

    // get details title, description
    const {title,description} = req.body
    if(!(title || description)){
        throw new ApiError(400,"Title and description missing")
    }

    // get thumbnail file
    
    const thumbnailLocalPath = req.file?.path

    if (!thumbnailLocalPath) {
        throw new ApiError(400,"thumbnail file is missing")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if(!thumbnail){
        throw new ApiError(400,"Thumbnail file is required")
    }


    // find video using video id and update

    const video = Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: thumbnail.url
            }
        },
        {
            new: true
        }
    )
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "updated video successfully"
        )
    )
})

// delete the video from the server
const deleteVideo = handler(async(req,res)=>{
    const {videoId} = req.params
    if (!videoId) {
        throw new ApiError(400,"Id missing")
    }
    const deletedVideo = await Video.findByIdAndDelete(videoId)
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            deletedVideo,
            "video deleted successfully"
        )
    )
})

// toggle the status that video is published or not
const togglePublishStatus = handler(async(req,res)=>{
    const {videoId} = req.params
    if (!videoId) {
        throw new ApiError(400,"ID missing")
    }

    // find the status and update the logic
    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(400,"Video not Found")
    }
    // video model has property ispublished check and change that
    video.isPublished = !video.isPublished
    await video.save()

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "video published successfully"
        )
    )


})



// export statements
export {
    getAllVideos,
    publishVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}

