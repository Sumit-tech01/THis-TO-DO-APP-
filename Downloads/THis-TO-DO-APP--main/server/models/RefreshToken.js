import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    familyId: {
      type: String,
      required: true,
      index: true,
    },
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    hashedToken: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    revokedReason: {
      type: String,
      default: null,
      trim: true,
    },
    replacedByToken: {
      type: String,
      default: null,
      index: true,
    },
    ipAddress: {
      type: String,
      default: null,
      trim: true,
      maxlength: 100,
    },
    userAgent: {
      type: String,
      default: null,
      trim: true,
      maxlength: 512,
    },
    deviceName: {
      type: String,
      default: null,
      trim: true,
      maxlength: 120,
    },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ userId: 1, familyId: 1, revokedAt: 1 });
refreshTokenSchema.index({ userId: 1, expiresAt: 1 });

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

export default RefreshToken;
