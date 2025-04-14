// src/app.js
import express from 'express';
import pg from 'pg';
import productRoutes from './routes/products.js';

const app = express();
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

pool.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to database');
  }
});

app.use('/api/products', productRoutes(pool));

app.get('/', (req, res) => {
  res.json({
    message: 'Inventory Tracking System API',
    endpoints: {
      "add-product": "/api/products/add-product",
      "get-products": "/api/products/get-products", 
      "get-product": "/api/products/get-product/:sku",
      "get-product-stock": "/api/products/get-product-stock/:sku",
      "get-stock-movements": "/api/products/get-stock-movements/:sku",
      "stock-in": "/api/products/stock-in",
      "sell": "/api/products/sell",
      "remove": "/api/products/remove"
    }
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;