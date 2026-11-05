const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
    sessionTitle: { type: String, required: true },
    frontText: { type: String, required: true },
    backText: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Flashcard', flashcardSchema);