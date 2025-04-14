import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import pool from '../database/database.js';
import auth from '../config/auth.js';

const router = express.Router();

router.post('/login', async (req, res) => {
    const { user_id, password} = req.body;

    if (!user_id || !password) {
        return res.status(400).json({ error: 'User ID and password are required' });
    }

    try {
        
        const result = await pool.query(
            'SELECT user_id, password_hash, role FROM users WHERE user_id = $1',
            [user_id]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

     
        const token = jwt.sign(
            { user_id: user.user_id, role: user.role, store_id: user.store_id },
            auth.secret,
            { expiresIn: auth.expiresIn }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600000
        });

        console.log('Auth cookie set:', token);

        res.json({
            message: 'Login successful',
            user: {
                user_id: user.user_id,
                role: user.role,
                token: token
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

export default router;
