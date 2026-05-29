import mongoose from "mongoose";
import { ServerApiVersion } from "mongodb";
import { logger } from "./logger.js";

export const connectDB = async (mongoUri) => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await mongoose.connection.db.admin().command({ ping: 1 });
  logger.info("MongoDB connected");
};
