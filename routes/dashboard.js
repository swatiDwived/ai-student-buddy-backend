const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Session = require('../models/Session');
const Flashcard = require('../models/Flashcard');
const User = require('../models/User'); 

// GET: Fetch dashboard analytics (Route 3)
router.get('/dashboard', auth, async (req, res) => {
    try {
        // Count active study sessions (Manila Folders) 
        const activeSessionsCount = await Session.countDocuments({ userId: req.user.id });
        
        // Count total generated flashcards
        const totalFlashcards = await Flashcard.countDocuments({ userId: req.user.id });

        // Retrieve denormalized gamification stats directly from the User model
        const user = await User.findById(req.user.id).select('activeStudyDays sessionsMastered');

        res.json({
            activeSessions: activeSessionsCount,
            totalFlashcardsCreated: totalFlashcards,
            activeStudyDays: user?.activeStudyDays || 0,
            sessionsMastered: user?.sessionsMastered || 0
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error fetching dashboard analytics');
    }
});

module.exports = router;