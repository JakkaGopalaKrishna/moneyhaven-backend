const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    // TTL index: MongoDB will automatically delete documents when expiresAt is reached
    expires: 0,
  },
});

// Hash OTP before saving
otpSchema.pre('save', async function (next) {
  if (!this.isModified('otp')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.otp = await bcrypt.hash(this.otp, salt);
});

// Method to verify OTP
otpSchema.methods.matchOtp = async function (enteredOtp) {
  return await bcrypt.compare(enteredOtp, this.otp);
};

const Otp = mongoose.model('Otp', otpSchema);

module.exports = Otp;
