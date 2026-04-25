import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

export const connectDB = async () => {
  try {
    let uri = process.env.MONGO_URI;

    if (process.env.NODE_ENV === 'development' || !process.env.MONGO_URI) {
      // Use in-memory MongoDB for development if not explicitly pointing to a real one
      // or if explicitly requested.
      mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      console.log('Started in-memory MongoDB Server');
    }

    await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
};
