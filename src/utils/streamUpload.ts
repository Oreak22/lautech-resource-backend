import cloudinary from "../config/cloudinary";
import streamifier from "streamifier";
import { UploadApiResponse, UploadApiErrorResponse } from "cloudinary";

export const streamUpload = (
  buffer: Buffer,
  folderName: string,
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        // 'auto' tells Cloudinary to figure out if it's an image, raw file (zip), or pdf
        resource_type: "auto",
      },
      (
        error: UploadApiErrorResponse | undefined,
        result: UploadApiResponse | undefined,
      ) => {
        if (result) resolve(result);
        else reject(error);
      },
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};
