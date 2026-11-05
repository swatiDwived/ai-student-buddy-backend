const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // We will create this model next!

const router = express.Router();

// 1. REGISTER USER
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, recoveryPin } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        // Hash password and PIN
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const hashedPin = await bcrypt.hash(recoveryPin, salt);

        // Save new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            recoveryPin: hashedPin
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// 2. LOGIN USER
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// 3. RESET PASSWORD
router.post('/reset-password', async (req, res) => {
    try {
        const { email, recoveryPin, newPassword } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isPinMatch = await bcrypt.compare(recoveryPin, user.recoveryPin);
        if (!isPinMatch) return res.status(400).json({ message: 'Invalid recovery PIN' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// 4. LOGOUT USER
router.post('/logout', (req, res) => {
    try {
        // With stateless JWTs, the server doesn't hold a session.
        // The React frontend will do the heavy lifting by deleting the token from localStorage.
        // This endpoint serves as a clean, standardized confirmation response.
        res.status(200).json({ message: 'User logged out successfully. Token must be cleared on the client side.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error during logout', error: error.message });
    }
});
module.exports = router;