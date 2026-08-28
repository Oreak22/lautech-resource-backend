import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI as string);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Listen for connection errors after initial connection
    mongoose.connection.on("error", (err) => {
      console.error(`MongoDB connection error: ${err}`);
    });
  } catch (error) {
    console.error(
      `Error connecting to MongoDB: ${error instanceof Error ? error.message : error}`,
    );
    process.exit(1); // Exit process with failure
  }
};
