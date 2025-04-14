    const express = require('express');
    const { nanoid } = require('nanoid');

    function generateSKU(name, category) {
        const shortName = name.replace(/\s+/g, "").substring(0, 4).toUpperCase();  // First 4 letters of product name
        const shortCat = category.substring(0, 3).toUpperCase();  // First 3 letters of category
        const uniqueCode = nanoid(6).toUpperCase();  // 6-character unique ID

        return `${shortName}-${shortCat}-${uniqueCode}`;
    }

    module.exports = (db) => {
        const router = express.Router();

        // Insert a new product
        router.post('/add-product', (req, res) => {
            const { name, category, unit_price } = req.body;

            if (unit_price <= 0) {
                return res.status(400).json({ error: 'Unit price must be greater than 0' });
            }

            const sku = generateSKU(name, category);

            const query = 'INSERT INTO products (sku, name, category, unit_price) VALUES (?, ?, ?, ?)';
            db.run(query, [sku, name, category, unit_price], function (err) {
                if (err) {
                    console.error(err.message);
                    return res.status(500).json({ error: 'Failed to insert product' });
                }
                res.status(201).json({ message: 'Product added successfully!', sku, name, category, unit_price });
            });
        });

        // Get all products
        router.get('/get-products', (req, res) => {
            const query = 'SELECT * FROM products';
            db.all(query, [], (err, rows) => {
                if (err) {
                    console.error(err.message);
                    return res.status(500).json({ error: 'Failed to fetch products' });
                }
                res.json(rows);
            });
        });

        // Get a single product by SKU
        router.get('/get-product/:sku', (req, res) => {
            const { sku } = req.params;
            const query = 'SELECT * FROM products WHERE sku = ?';

            db.get(query, [sku], (err, row) => {
                if (err) {
                    console.error(err.message);
                    return res.status(500).json({ error: 'Failed to fetch product' });
                }
                if (!row) {
                    return res.status(404).json({ message: 'Product not found' });
                }
                res.json(row);
            });
        });

        // Get product stock by SKU
        router.get('/get-product-stock/:sku', (req, res) => {
            const { sku } = req.params;

            const query = `
                SELECT p.sku, p.name, ps.quantity 
                FROM products p
                JOIN product_stock ps ON p.sku = ps.sku
                WHERE p.sku = ?;
            `;

            db.get(query, [sku], (err, row) => {
                if (err) {
                    console.error(err.message);
                    return res.status(500).json({ error: 'Failed to fetch product stock' });
                }

                if (!row) {
                    return res.status(404).json({ message: 'Product not found or stock not available.' });
                }

                res.json(row);
            });
        });

        // Get stock movements by SKU
        router.get('/get-stock-movements/:sku', (req, res) => {
            const { sku } = req.params;

            const query = `
                SELECT sm.movement_id, sm.sku, sm.movement_type, sm.quantity, sm.movement_timestamp
                FROM stock_movements sm
                WHERE sm.sku = ?
                ORDER BY sm.movement_timestamp DESC;
            `;

            db.all(query, [sku], (err, rows) => {
                if (err) {
                    console.error(err.message);
                    return res.status(500).json({ error: 'Failed to fetch stock movements' });
                }

                if (rows.length === 0) {
                    return res.status(404).json({ message: 'No stock movements found for this SKU.' });
                }

                res.json(rows);
            });
        });

        router.post('/stock-in', (req, res) => {
            const { sku, quantity } = req.body;

            if (!sku || quantity <= 0) {
                return res.status(400).json({ error: 'Invalid SKU or quantity must be greater than 0' });
            }

            // Check if SKU exists
            db.get('SELECT sku FROM products WHERE sku = ?', [sku], (err, row) => {
                if (err) {
                    console.error(err.message);
                    return res.status(500).json({ error: 'Database error while checking SKU' });
                }

                if (!row) {
                    return res.status(404).json({ error: 'Product not found' });
                }

                // Insert stock movement
                const query = `
                    INSERT INTO stock_movements (sku, movement_type, quantity) 
                    VALUES (?, 'stock-in', ?)
                `;
                db.run(query, [sku, quantity], function (err) {
                    if (err) {
                        console.error(err.message);
                        return res.status(500).json({ error: 'Failed to record stock movement' });
                    }

                    res.status(201).json({ message: 'Stock added successfully', sku, quantity });
                });
            });
        });

        // Sell product
        router.post('/sell', (req, res) => {
            const { sku, quantity } = req.body;

            if (!sku || quantity <= 0) {
                return res.status(400).json({ error: 'Invalid SKU or quantity must be greater than 0' });
            }

            // Check if SKU exists and has enough stock
            db.get('SELECT ps.quantity FROM products p JOIN product_stock ps ON p.sku = ps.sku WHERE p.sku = ?', [sku], (err, row) => {
                if (err) {
                    console.error(err.message);
                    return res.status(500).json({ error: 'Database error while checking SKU' });
                }

                if (!row) {
                    return res.status(404).json({ error: 'Product not found' });
                }

                if (row.quantity < quantity) {
                    return res.status(400).json({ error: 'Insufficient stock' });
                }

                // Insert stock movement with negative quantity for sale
                const query = `
                    INSERT INTO stock_movements (sku, movement_type, quantity) 
                    VALUES (?, 'sale', ?)
                `;
                db.run(query, [sku, -quantity], function (err) {
                    if (err) {
                        console.error(err.message);
                        return res.status(500).json({ error: 'Failed to record stock movement' });
                    }

                    res.status(201).json({ message: 'Product sold successfully', sku, quantity });
                });
            });
        });

        // Remove product stock manually
        router.post('/remove', (req, res) => {
            const { sku, quantity } = req.body;

            if (!sku || quantity <= 0) {
                return res.status(400).json({ error: 'Invalid SKU or quantity must be greater than 0' });
            }

            // Check if SKU exists and has enough stock
            db.get('SELECT ps.quantity FROM products p JOIN product_stock ps ON p.sku = ps.sku WHERE p.sku = ?', [sku], (err, row) => {
                if (err) {
                    console.error(err.message);
                    return res.status(500).json({ error: 'Database error while checking SKU' });
                }

                if (!row) {
                    return res.status(404).json({ error: 'Product not found' });
                }

                if (row.quantity < quantity) {
                    return res.status(400).json({ error: 'Insufficient stock' });
                }

                // Insert stock movement with negative quantity for manual removal
                const query = `
                    INSERT INTO stock_movements (sku, movement_type, quantity) 
                    VALUES (?, 'manual-removal', ?)
                `;
                db.run(query, [sku, -quantity], function (err) {
                    if (err) {
                        console.error(err.message);
                        return res.status(500).json({ error: 'Failed to record stock movement' });
                    }

                    res.status(201).json({ message: 'Stock removed successfully', sku, quantity });
                });
            });
        });

        return router;
    };
