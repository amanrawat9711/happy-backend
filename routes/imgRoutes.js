import express from 'express';
import { addImages, deleteImage, getImage } from '../controllers/animationImgcontroller.js'; // Import addImages
import upload from '../middlewares/multer.js';

const router = express.Router();

// Endpoint to add multiple images (up to 8), requires imageType for each in body
router.post("/images", upload.array("images", 15), addImages); // Changed endpoint to /images and used upload.array
// Endpoint to get all images
router.get("/get-image", getImage);
router.delete("/images/:id", deleteImage);

export default router;