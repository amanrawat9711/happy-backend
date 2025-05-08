// models/animationModel.js
import mongoose from 'mongoose';

const animationSchema = new mongoose.Schema({
  imageUrl: String,
  publicId: String, // Add this field to store Cloudinary public ID
  imageType: { type: String, enum: ['big', 'small'] },
  // add other fields if needed
});

const AnimationModel = mongoose.model('Animation', animationSchema);
export default AnimationModel;