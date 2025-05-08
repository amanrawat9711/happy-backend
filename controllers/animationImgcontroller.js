// controllers/animationController.js
import ImageModel from "../models/animationModel.js";
import { v2 as cloudinary } from "cloudinary";
import fs from 'fs';

// Cloudinary configuration
cloudinary.config({
  cloud_name: 'YOUR_CLOUD_NAME',
  api_key: 'YOUR_API_KEY',
  api_secret: 'YOUR_API_SECRET',
});

// Add multiple images
export const addImages = async (req, res) => {
  try {
    const imageTypesString = req.body.imageTypes;
    const files = req.files;

    if (!files || files.length === 0) {
      req.files?.forEach(file => {
        if (file.path) fs.unlink(file.path, () => {});
      });
      return res.status(400).json({ success: false, message: "No images uploaded" });
    }

    if (!imageTypesString || typeof imageTypesString !== 'string') {
      files.forEach(file => {
        if (file.path) fs.unlink(file.path, () => {});
      });
      return res.status(400).json({ success: false, message: "Invalid imageTypes string" });
    }

    const imageTypes = imageTypesString.split(',').map(t => t.trim());

    if (imageTypes.length !== files.length) {
      files.forEach(file => {
        if (file.path) fs.unlink(file.path, () => {});
      });
      return res.status(400).json({ success: false, message: "Mismatch between imageTypes and files" });
    }

    const uploadedImagesData = [];
    const failedUploads = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const imageType = imageTypes[i];

      try {
        const uploadResult = await cloudinary.uploader.upload(file.path, {
          folder: "your_upload_folder",
        });

        if (uploadResult && uploadResult.secure_url && uploadResult.public_id) {
          uploadedImagesData.push({
            imageUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            imageType,
          });
        } else {
          failedUploads.push(file.originalname);
        }
      } catch (err) {
        console.error("Upload error:", err);
        failedUploads.push(file.originalname);
      } finally {
        if (file.path) {
          fs.unlink(file.path, () => {});
        }
      }
    }

    if (uploadedImagesData.length === 0) {
      const msg = failedUploads.length > 0
        ? `No images uploaded successfully. Failed: ${failedUploads.join(', ')}`
        : "No images uploaded.";
      return res.status(500).json({ success: false, message: msg });
    }

    const createdImages = await ImageModel.insertMany(uploadedImagesData);

    let responseMessage = `${uploadedImagesData.length} images uploaded successfully.`;
    if (failedUploads.length > 0) {
      responseMessage += ` Failed uploads: ${failedUploads.join(', ')}.`;
    }

    res.status(201).json({
      success: true,
      message: responseMessage,
      images: createdImages,
      failedUploads,
    });
  } catch (error) {
    console.error("Error in addImages:", error);
    req.files?.forEach(file => {
      if (file.path) fs.unlink(file.path, () => {});
    });
    res.status(500).json({ success: false, message: "Server error during batch upload", error: error.message });
  }
};

// Get images (limit to 8 big and 7 small)
export const getImage = async (req, res) => {
  try {
    const allImages = await ImageModel.find({});

    if (!allImages || allImages.length === 0) {
      return res.json({ success: true, images: [] });
    }

    const bigImages = allImages.filter(i => i.imageType === 'big').slice(0, 8);
    const smallImages = allImages.filter(i => i.imageType === 'small').slice(0, 7);

    const limitedImages = [...bigImages, ...smallImages];

    res.json({
      success: true,
      images: limitedImages.map(i => ({
        _id: i._id,
        imageUrl: i.imageUrl,
        imageType: i.imageType,
        publicId: i.publicId, // optional, if needed
      })),
    });
  } catch (err) {
    console.error("Error in getImage:", err);
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

// Delete image by ID and from Cloudinary
export const deleteImage = async (req, res) => {
  const { id } = req.params;
  try {
    const image = await ImageModel.findById(id);
    if (!image) {
      return res.status(404).json({ success: false, message: "Image not found" });
    }

    // Delete from Cloudinary
    if (image.publicId) {
      await cloudinary.uploader.destroy(image.publicId);
    }

    // Remove from database
    await ImageModel.findByIdAndDelete(id);
    res.json({ success: true, message: "Image deleted" });
  } catch (err) {
    console.error("Error deleting image:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};