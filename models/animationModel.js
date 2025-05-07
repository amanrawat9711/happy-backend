import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema(
  {
      imageUrl: { // Store the URL of the uploaded image
        type: String,
        required: true,
      },
      imageType: { // Add a field to distinguish between 'big' and 'small'
        type: String,
        required: true,
        enum: ['big', 'small'], // Restrict values to 'big' or 'small'
      },
  },
  { timestamps: true }
);

const ImageModel = mongoose.model('Image', imageSchema);

export default ImageModel;