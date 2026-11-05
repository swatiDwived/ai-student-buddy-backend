const express = require('express');
const router = express.Router();
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

// Middleware & Models
const upload = require('../middleware/uploadMiddleware');
const auth = require('../middleware/authMiddleware');
const Session = require('../models/Session');
const Flashcard = require('../models/Flashcard'); 

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// POST: /api/rag/upload-pdf
router.post('/upload-pdf', auth, upload.single('pdfDocument'), async (req, res) => {
    try {
        const { sessionTitle } = req.body; 
        
        if (!req.file || !sessionTitle) {
            return res.status(400).json({ message: 'PDF file and Session Title are required.' });
        }

        // 1. Create a new Session (Manila Folder) for this PDF
        const newSession = new Session({
            userId: req.user.id,
            title: sessionTitle
        });
        const session = await newSession.save();

        // 2. Upload to Google AI File API
        const uploadResult = await ai.files.upload({
            file: req.file.path,
            mimeType: req.file.mimetype,
        });

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

        const prompt = "You are an academic parser. Generate 15 flashcards in the required JSON format based strictly on the uploaded document. Do not use outside knowledge.";

        // 4. Generate Content with Gemini 3.5 Flash-Lite
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { fileData: { fileUri: uploadResult.uri, mimeType: uploadResult.mimeType } },
                        { text: prompt }
                    ]
                }
            ],
            config: generationConfig
        });

        // 5. Parse JSON and Save to Database
        const generatedCards = JSON.parse(response.text);
        const savedCards = [];
        
        for (const card of generatedCards) {
            const newCard = new Flashcard({
                userId: req.user.id,
                sessionId: session._id,
                sessionTitle: session.title,
                frontText: card.frontText,
                backText: card.backText
            });
            const saved = await newCard.save();
            savedCards.push(saved);
        }

        // 6. Housekeeping: Delete local file
        fs.unlinkSync(req.file.path);

        res.status(201).json(savedCards);

    } catch (err) {
       // Force a highly visible error log
        console.log("=== RAG CRASH REPORT ===");
        console.error("Error Name:", err.name);
        console.error("Error Message:", err.message);
        if (err.status) console.error("API Status:", err.status);
        console.log("========================");

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ 
            message: 'Server Error during PDF RAG processing',
            details: err.message 
        });
    }
});

module.exports = router;