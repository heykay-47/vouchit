import mongoose from 'mongoose';

const cached = globalThis as typeof globalThis & {
  mongooseConnection?: Promise<typeof mongoose>;
};

export const connectDb = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  if (!cached.mongooseConnection) {
    cached.mongooseConnection = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
    }).catch((error) => {
      cached.mongooseConnection = undefined;
      throw error;
    });
  }

  return cached.mongooseConnection;
};
