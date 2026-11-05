const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const auth = require('../middleware/authMiddleware'); // Your security guard

// POST: Create a new Study Session ("Manila Folder")
router.post('/', auth, async (req, res) => {
    try {
        const newSession = new Session({
            userId: req.user.id, // Pulled securely from the JWT token
            title: req.body.title || 'New Study Session'
        });

        const savedSession = await newSession.save();
        res.status(201).json(savedSession);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET: Fetch all Study Sessions for the logged-in user
router.get('/', auth, async (req, res) => {
    try {
        // Fetch only sessions belonging to this exact user, newest first
        const sessions = await Session.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(sessions);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;