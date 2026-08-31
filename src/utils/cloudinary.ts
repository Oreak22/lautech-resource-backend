import cloudinary from "../config/cloudinary";

// Uses the explicit public ID to securely delete the file
export const deleteFromCloudinary = async (publicId: string) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary Delete Error:", error);
  }
};
