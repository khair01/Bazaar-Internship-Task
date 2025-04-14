import app from './app.js';
import pool from './database/database.js';

const port = process.env.PORT || 3000;

pool.connect().then(async () => {
    console.log('Successfully connected to PostgreSQL database');
    
}).catch((err) => {
    console.error('Error connecting to PostgreSQL database:', err);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});