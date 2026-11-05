const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, default: 'New Study Session' }
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);