import pkg from 'pg';
const { Pool } = pkg;
// Set up the PostgreSQL client
const pool = new Pool({
    user: 'postgres.hgjwsycliaywhkpmbbon',               // Supabase database user
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',   // Supabase host
    database: 'postgres',       // Supabase database name
    password: 'bazaar-task!',       // Supabase password
    port: 6543,
    ssl: {
        rejectUnauthorized: false
    }
});

export default pool;
