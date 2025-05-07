import ImageModel from "../models/animationModel.js";
import { v2 as cloudinary } from "cloudinary";
import fs from 'fs'; // Import the file system module to delete temporary files

// Function to add multiple images
export const addImages = async (req, res) => {
    try {
      const imageTypesString = req.body.imageTypes;
      const files = req.files; // Multer puts multiple files in req.files

      console.log("Received imageTypesString:", imageTypesString);
      console.log("Number of files received:", files ? files.length : 0);

      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, message: "No images uploaded" });
      }

      if (!imageTypesString || typeof imageTypesString !== 'string') {
          // Clean up temporary files if validation fails before upload
          files.forEach(file => {
              if (file.path) {
                  fs.unlink(file.path, (err) => {
                      if (err) console.error("Error deleting temp file:", file.path, err);
                  });
              }
          });
          return res.status(400).json({ success: false, message: "Invalid imageTypes string in request body. It must be a comma-separated string." });
      }

      const imageTypes = imageTypesString.split(',').map(type => type.trim());
      console.log("Parsed imageTypes array:", imageTypes);
      console.log("Number of parsed imageTypes:", imageTypes.length);

      if (imageTypes.length !== files.length) {
           // Clean up temporary files if validation fails before upload
           files.forEach(file => {
               if (file.path) {
                   fs.unlink(file.path, (err) => {
                       if (err) console.error("Error deleting temp file:", file.path, err);
                   });
               }
           });
          return res.status(400).json({ success: false, message: `Number of imageTypes (${imageTypes.length}) does not match the number of uploaded files (${files.length}).` });
      }

      const uploadedImagesData = [];
      const failedUploads = [];

      // Loop through each uploaded file
      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const imageType = imageTypes[i]; // Get the corresponding image type

          try {
              // Upload the file to Cloudinary using the file path (since you use diskStorage)
              const uploadResult = await cloudinary.uploader.upload(file.path, {
                  folder: "your_upload_folder", // Optional: specify a folder in Cloudinary (RECOMMENDED)
                  // Add any other Cloudinary upload options here (e.g., resource_type: 'auto')
              });

              // Check if upload was successful
              if (uploadResult && uploadResult.secure_url) {
                  uploadedImagesData.push({
                      // We'll store the Cloudinary URL in the imageUrl field
                      imageUrl: uploadResult.secure_url,
                      imageType: imageType, // The image type provided
                      // You might want to store public_id for future deletion/management
                      // public_id: uploadResult.public_id,
                  });
              } else {
                   console.error("Cloudinary upload failed for file:", file.originalname, "Result:", uploadResult);
                   failedUploads.push(file.originalname);
              }

          } catch (uploadError) {
              console.error("Error uploading file to Cloudinary:", file.originalname, uploadError);
              failedUploads.push(file.originalname);
          } finally {
               // IMPORTANT: Delete the temporary file from the server after attempting upload
               if (file.path) {
                   fs.unlink(file.path, (err) => {
                       if (err) console.error("Error deleting temp file:", file.path, err);
                   });
               }
          }
      }

      // Check if any images were successfully uploaded
      if (uploadedImagesData.length === 0) {
           // If there were failed uploads, include that in the message
           const message = failedUploads.length > 0
               ? `No images were successfully uploaded to Cloudinary. Failed: ${failedUploads.join(', ')}`
               : "No images were successfully uploaded to Cloudinary.";
           return res.status(500).json({ success: false, message: message });
      }

      // Save the uploaded image data to your database
      const createdImages = await ImageModel.insertMany(uploadedImagesData);

      // Construct a response message based on successful and failed uploads
      let responseMessage = `${uploadedImagesData.length} images uploaded and saved successfully.`;
      if (failedUploads.length > 0) {
          responseMessage += ` ${failedUploads.length} images failed to upload: ${failedUploads.join(', ')}.`;
          // You might want to return a different status code like 207 (Multi-Status)
      }


      res.status(201).json({
          success: true,
          message: responseMessage,
          images: createdImages,
          failedUploads: failedUploads // Optionally include list of failed uploads
      });

    } catch (error) {
      console.error("Error adding images batch:", error);
      // Clean up any remaining temporary files if an error occurred before cleanup loop
      if (req.files) {
          req.files.forEach(file => {
               if (file.path) {
                   fs.unlink(file.path, (err) => {
                       if (err) console.error("Error deleting temp file:", file.path, err);
                   });
               }
          });
      }
      res.status(500).json({ success: false, message: "Internal server error during batch processing", error: error.message });
    }
};

export const getImage = async (req, res) => {
    try {
        // Fetch all images from the database
        // We fetch all first to easily separate by type and then apply limits
        const allImages = await ImageModel.find({});

        if (!allImages || allImages.length === 0) {
            return res.status(200).json({ success: true, message: "No images found to display.", images: [] });
        }

        // Separate images by type
        const bigImages = allImages.filter(img => img.imageType === 'big');
        const smallImages = allImages.filter(img => img.imageType === 'small');

        // --- Apply the limits ---

        // Limit big images to a maximum of 8
        const limitedBigImages = bigImages.slice(0, 8);

        // Limit small images to a maximum of 7
        const limitedSmallImages = smallImages.slice(0, 7);

        // Combine the limited lists
        const limitedImages = [...limitedBigImages, ...limitedSmallImages];

        // Respond with the limited set of images
        res.status(200).json({
            success: true,
            images: limitedImages.map(img => ({
                imageUrl: img.imageUrl, // Ensure you only send necessary data
                imageType: img.imageType
            })),
        });

    } catch (error) {
        console.error("Error getting and limiting images:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};