import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not configured");
}

const globalCache = globalThis;
const cached = globalCache.__mongoose ?? { connection: null, promise: null };
globalCache.__mongoose = cached;

export async function connectDb() {
  if (cached.connection) return cached.connection;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false })
      .then((instance) => instance);
  }
  try {
    cached.connection = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
  return cached.connection;
}
