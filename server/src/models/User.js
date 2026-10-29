const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    storageUsed: {
      type: Number,
      default: 0, // in bytes
    },
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
      index: true,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
      index: true,
    },
    disabledReason: {
      type: String,
      default: null,
    },
    disabledAt: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
      index: true,
    }
  },
  {
    timestamps: true,
  }
);

userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);
module.exports = User;
