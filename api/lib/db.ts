import mongoose from 'mongoose';

const cached = globalThis as typeof globalThis & {
  mongooseConnection?: Promise<typeof mongoose>;
};

mongoose.set('strictQuery', true);

export const connectDb = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  if (!cached.mongooseConnection) {
    cached.mongooseConnection = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    }).catch((error) => {
      cached.mongooseConnection = undefined;
      throw error;
    });
  }

  return cached.mongooseConnection;
};
