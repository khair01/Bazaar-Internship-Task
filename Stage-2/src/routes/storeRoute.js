import express from 'express';
import pool from '../database/database.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';
import { nanoid } from 'nanoid';

const router = express.Router();

// Get all stores
router.get('/', authMiddleware, async (req, res) => {
    try {
        const stores = await pool.query('SELECT * FROM stores');
        res.json(stores.rows);
    } catch (error) {
        console.error('Error getting stores:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get store by ID
router.get('/:store_id', authMiddleware, async (req, res) => {
    try {
        const { store_id } = req.params;
        const store = await pool.query('SELECT * FROM stores WHERE store_id = $1', [store_id]);
        
        if (store.rows.length === 0) {
            return res.status(404).json({ error: 'Store not found' });
        }
        
        res.json(store.rows[0]);
    } catch (error) {
        console.error('Error getting store:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add new store (admin only)
router.post('/add', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { store_name } = req.body;
        
        if (!store_name) {
            return res.status(400).json({ error: 'Store name is required' });
        }

        const store_id = nanoid(5);
        
        const newStore = await pool.query(
            'INSERT INTO stores (store_id, store_name) VALUES ($1, $2) RETURNING *',
            [store_id, store_name]
        );

        res.status(201).json({
            message: 'Store added successfully',
            store: newStore.rows[0]
        });
    } catch (error) {
        console.error('Error adding store:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
