import { Router } from "express";
import { upload } from "../middleware/multer.middleware.js"
import { 
    registerUser,
    loginUser,
    logoutUser, 
    updateCurrentPassword,
    getCurrentUser,
    updateCurrentDetails,
    updateAvatarFile,
    updateCoverImageFile,
    getWatchHistory
} from "../controllers/users.controllers.js";
import { verifyJWT } from "../middleware/auth.middleware.js";


const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)
router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT,  logoutUser)
router.route("/change-password").post(verifyJWT,updateCurrentPassword)
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/update-details").patch(verifyJWT,updateCurrentDetails)
router.route("/update-avatar").patch(verifyJWT,upload.single("avatar"),updateAvatarFile)
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateCoverImageFile)
router.route("/c/:username").get(verifyJWT, getCurrentUser)
router.route("/history").get(verifyJWT, getWatchHistory)
export default router 