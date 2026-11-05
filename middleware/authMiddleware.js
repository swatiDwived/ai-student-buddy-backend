// grabs the token from the request header, uses the JWT_SECRET from your .env file to verify it is real, and then attaches the user's ID to the request so the next route knows exactly who is logged in.
// const jwt = require('jsonwebtoken');
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // 1. Get the token from the header
    const token = req.header('Authorization');

    // 2. Check if no token exists
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // 3. Remove "Bearer " if it exists and verify token
        const actualToken = token.split(' ')[1] || token;
        const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
        
        // 4. Attach the user ID to the request
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};