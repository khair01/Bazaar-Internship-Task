import express from 'express';
import cookieParser from 'cookie-parser';
import loginRouter from './routes/loginRoutes.js';
import storeRouter from './routes/storeRoute.js';

const app = express();

app.use(express.json());
app.use(cookieParser());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});


// Routes //

app.use('/auth', loginRouter);
app.use('/store', storeRouter);
app.get('/', (req, res) => {
  res.json({
    message: 'Inventory Tracking System API',
    endpoints: {
      "login": "/auth/login", 
      "logout": "/auth/logout"
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
