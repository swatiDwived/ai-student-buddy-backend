const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const Message = require('../models/Message');
const Session = require('../models/Session');
const Flashcard = require('../models/Flashcard'); // Ensure you have this model created!
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// POST: Manually generate flashcards from chat history
router.post('/generate/:sessionId', auth, async (req, res) => {
    try {
        const { sessionId } = req.params;

        // 1. Security Check
        const session = await Session.findOne({ _id: sessionId, userId: req.user.id });
        if (!session) {
            return res.status(404).json({ message: 'Session not found or unauthorized' });
        }

        // 2. Fetch the chat history for this session to provide context
        const messages = await Message.find({ sessionId }).sort({ createdAt: 1 });
        if (messages.length === 0) {
            return res.status(400).json({ message: 'No chat history to generate flashcards from.' });
        }

        // Combine the chat into a readable transcript for the AI
        const chatTranscript = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

        // 3. Strict JSON Configuration
        const generationConfig = {
            responseMimeType: "application/json",
            responseSchema: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        frontText: { type: "string" },
                        backText: { type: "string" }
                    },
                    required: ["frontText", "backText"]
                }
            }
        };

        const prompt = `You are an expert educator. Extract the most important concepts from the following chat transcript and create highly effective flashcards. Do not include any outside information. \n\nTranscript:\n${chatTranscript}`;

        // 4. Send to Gemini 3.5 Flash-Lite
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: prompt,
            config: generationConfig
        });

        // 5. Parse the strictly formatted JSON array
        const generatedCards = JSON.parse(response.text);

        // 6. Save each flashcard to MongoDB tied to the user and session
        const savedCards = [];
        for (const card of generatedCards) {
            const newCard = new Flashcard({
                userId: req.user.id,
                sessionId: sessionId,
                sessionTitle: session.title,
                frontText: card.frontText,
                backText: card.backText
            });
            const saved = await newCard.save();
            savedCards.push(saved);
        }
    // 7. Securely increment the mastery count on the backend
        await User.findByIdAndUpdate(
            req.user.id,
            { $inc: { sessionsMastered: 1 } }
        );
        // Return the freshly saved cards to the frontend
        res.status(201).json(savedCards);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error generating flashcards');
    }
});
// GET: Fetch flashcards for a specific session (Route 9 - In-Chat Drawer)
router.get('/:sessionId', auth, async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // Security: Strictly tied to userId for data isolation
        const cards = await Flashcard.find({ 
            sessionId: sessionId, 
            userId: req.user.id 
        }).sort({ createdAt: -1 });
        
        res.json(cards);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error fetching session flashcards');
    }
});

// GET: Fetch all flashcards globally (Route 10 - Global Library)
router.get('/', auth, async (req, res) => {
    try {
        // Pagination: Protects the server and enables React Infinite Scroll
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const cards = await Flashcard.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json(cards);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error fetching global flashcards');
    }
});

module.exports = router;