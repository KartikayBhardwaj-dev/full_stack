import mongoose , {isValidObjectId} from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {handler} from "../utils/handlers.js"
import { Video } from "../models/video.models.js"

const getVideoComments = handler(async (req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10 , sortBy = "createdAt" , sortType = "desc"} = req.query

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400,"Missing or Invalid Id")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(400,"Video Not Found")
    }

    const pipeline = [
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
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
                createdBy: {
                    $first: "$createdBy"
                },
            },
        },
        {
            $unwind: "$createdBy"
        },
        {
            $sort: {
              [sortBy]: sortType === "asc" ? 1 : -1,
            },
          },
          {
            $project: {
              content: 1,
              createdBy: 1,
              updatedAt: 1,
            },
          },
    ]
    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        pagination: true,
      };
    const aggregateQuery = await Comment.aggregate(pipeline)
    if (!aggregateQuery) {
        return next(new ApiError(404, "no comments found for this video"));
      }
      const result = await Comment.aggregatePaginate(aggregateQuery, options);

      if (!result || result.docs?.length === 0) {
        throw new ApiError(404, "No comments found for this video");
      }
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        {
        totalDocs: result.totalDocs,
        count: result.docs?.length,
        totalComments: result.docs,
        totalPages: result.totalPages,
        currentPage: result.page,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
        nextPage: result.nextPage,
        prevPage: result.prevPage,
        pagingCounter: result.pagingCounter,
        },
        "Comments fetched successfully"
    ))
})

const addComment = handler(async (req, res) => {
    const {videoId} = req.params
    const {content} = req.body
    const userId = req.user._id
    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400,"Missing or Invalid Id")
    }
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Please write something for comment");
      }
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(400,"Video not found")
    }
    const comment = await Comment.create({
        content: content,
        video: videoId,
        owner: userId
    })
    if(!comment){
        throw new ApiError(400,"Failed to create comment")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            comment,
            "Comment created successfully"
        )
    )
})

const updateComment = handler(async (req, res) => {
    const userId = req.user._id
    const {commentId} = req.params
    const { content } = req.body
    if(!commentId || !isValidObjectId(commentId)){
        throw new ApiError(403,"Missing or invalid comment")
    }
    if(!content){
        throw new ApiError(400,"Please Provide comment")
    }

    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(400,"Comment Not Found")
    }

    if(!comment.owner.equals(userId)){
        throw new ApiError(403,"You are not allowed to Update comment ")
    }
    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content
            }
        },
        {
            new: true
        }

    )
    if(!updatedComment){
        throw new ApiError(400,"Failed to update Comment")
    }
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        updatedComment,
        "comment udpated successfully"
    ))



})

const deleteComment = handler(async (req, res) => {
    const { commentId } = req.params;

    if (!commentId || !isValidObjectId(commentId)) {
      throw new ApiError(400, "Missing or Invalid comment Id");
    }
  
    const userID = req.user._id;
  
    const comment = await Comment.findById(commentId);
  
    if (!comment) {
      throw new ApiError(400, "Comment not found");
    }
  
    if (!comment.owner.equals(userID)) {
      throw new ApiError(403, "You are not allowed to delete this comment");
    }
  
    const deletedComment = await Comment.findByIdAndDelete(commentId);
  
    if (!deletedComment) {
      throw new ApiError(400, "Failed to delete the comment");
    }
  
    return res
      .status(200)
      .json(new ApiResponse(200, deleteComment, "Comment deleted"));
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }