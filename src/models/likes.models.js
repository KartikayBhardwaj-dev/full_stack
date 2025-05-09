import mongoose,{Schema} from "mongoose";

const likeSchema = new Schema(
    {
        comment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        },
        video: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video"
        },
        likedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        tweet: {
            types: mongoose.Schema.Types.ObjectId,
            ref: "Tweet"
        }
    },{timestamps: true}
)

export const Like = mongoose.model("Like",likeSchema)