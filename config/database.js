import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool, Client } = pg;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'mini_system_software_toolkit',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
});

export async function ensureDatabaseExists() {
    const databaseName = process.env.DB_NAME || 'mini_system_software_toolkit';
    const adminClient = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        database: 'postgres',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
    });

    await adminClient.connect();

    try {
        const result = await adminClient.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [databaseName]
        );

        if (result.rowCount === 0) {
            const safeDatabaseName = databaseName.replace(/"/g, '""');
            await adminClient.query(`CREATE DATABASE "${safeDatabaseName}"`);
            console.log(`Created PostgreSQL database: ${databaseName}`);
        }
    } finally {
        await adminClient.end();
    }
}

export default pool;
