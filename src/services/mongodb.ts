import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/avaliacao_pratica';

interface MongooseConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

let cached: MongooseConnection = (global as any).mongoose || { conn: null, promise: null };
if (!(global as any).mongoose) {
  (global as any).mongoose = cached;
}

export async function connectToDatabase() {
  if (cached.conn) {
    console.log('Using existing MongoDB connection');
    return cached.conn;
  }

  if (!MONGO_URI) {
    throw new Error('Please define the MONGO_URI environment variable');
  }

  if (!cached.promise) {
    const options = { bufferCommands: false };
    cached.promise = mongoose.connect(MONGO_URI, options).then((mongoose) => {
      console.log('Connected to MongoDB successfully');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error('MongoDB connection error:', error);
    throw error;
  }

  return cached.conn;
}