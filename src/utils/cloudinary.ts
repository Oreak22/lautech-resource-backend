import cloudinary from "../config/cloudinary";

// Extracts the public ID from the secure_url and deletes the file
export const deleteFromCloudinary = async (fileUrl: string) => {
  try {
    // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/lautech_resources/xyz123.pdf
    const urlParts = fileUrl.split("/");
    const folderAndFile = urlParts.slice(-2).join("/"); // lautech_resources/xyz123.pdf
    const publicId = folderAndFile.split(".")[0]; // lautech_resources/xyz123

    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary Delete Error:", error);
  }
};
