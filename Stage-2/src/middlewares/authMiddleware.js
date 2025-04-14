import jwt from 'jsonwebtoken';
import auth from '../config/auth.js';

const authMiddleware = (req, res, next) => {
    const token = req.cookies.token; 

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized - No Token Provided' });
    }

    try {
        const decoded = jwt.verify(token, auth.secret);
        req.user = decoded; 
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Forbidden - Invalid Token' });
    }
};

const adminMiddleware = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden - Admins Only' });
    }
    next();
};

export { authMiddleware, adminMiddleware };
