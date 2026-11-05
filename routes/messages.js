const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai'); 
const Message = require('../models/Message');
const Session = require('../models/Session');
const auth = require('../middleware/authMiddleware');

// Initialize Gemini using the key from your .env file
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// POST: Send a message to Gemini (Route 7 - Sliding Window Algorithm)
router.post('/:sessionId', auth, async (req, res) => {
    try {
        const { sessionId } = req.params;
        // 1. Extract the persona selected by the user on the frontend
        const { content, persona } = req.body;

        // Security Check: Verify session belongs to this exact user
        const session = await Session.findOne({ _id: sessionId, userId: req.user.id });
        if (!session) {
            return res.status(404).json({ message: 'Session not found or unauthorized' });
        }

        // THE SLIDING WINDOW: Fetch the last 15 messages for context
        let recentMessages = await Message.find({ sessionId })
            .sort({ createdAt: -1 })
            .limit(15);
        recentMessages = recentMessages.reverse();

        // Format history perfectly for Gemini's strict requirements
        const contents = recentMessages.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }));

        // Append the user's brand new message to the end of the context array
        contents.push({
            role: 'user',
            parts: [{ text: content }]
        });

        // Save the user's NEW message to MongoDB
        const userMessage = new Message({ sessionId, role: 'user', content });
        await userMessage.save();
        
        console.log(" Checkpoint 1: User message saved to MongoDB. Sending to Gemini...");

        // 2. Invisible Prompt Engineering Logic
        let systemInstructionText = "You are a helpful, encouraging AI study buddy."; 
        if (persona === 'interviewer') {
            systemInstructionText = "You are a strict, professional technical interviewer. Ask probing questions, do not give away answers easily, and evaluate the user's responses critically.";
        }

        // 3. Send the isolated history, new message, and secret persona instruction to Gemini
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: contents,
            config: {
                systemInstruction: systemInstructionText
            }
        });
        
        console.log("Checkpoint 2: Gemini responded successfully!");

        const aiResponseText = response.text;

        // Save the AI's response to MongoDB
        const aiMessage = new Message({ sessionId, role: 'model', content: aiResponseText });
        await aiMessage.save();
        
        console.log("Checkpoint 3: AI message saved to MongoDB. Sending to Postman!");

        // Return both messages to the frontend
        res.status(200).json({ userMessage, aiMessage });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// GET: Fetch all messages for a specific session (Route 6 - Chat Drawer - Pagination)
router.get('/:sessionId', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20; 
        const skip = (page - 1) * limit;

        // 1. Grab the newest messages first
        const messages = await Message.find({ sessionId: req.params.sessionId })
            .sort({ createdAt: -1 }) 
            .skip(skip)
            .limit(limit);

        // 2. Flip them back to chronological order (Question -> Answer)
        res.json(messages.reverse()); 
        
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
module.exports = router;