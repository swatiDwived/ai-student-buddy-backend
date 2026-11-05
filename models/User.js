const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    recoveryPin: { type: String, required: true }, 
    activeStudyDays: { type: Number, default: 0 },
    sessionsMastered: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);