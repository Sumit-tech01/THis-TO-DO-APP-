import mongoose from "mongoose";

export const toObjectId = (id) => {
  if (id instanceof mongoose.Types.ObjectId) {
    return id;
  }

  if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid ObjectId");
    error.statusCode = 400;
    throw error;
  }

  return new mongoose.Types.ObjectId(id);
};
