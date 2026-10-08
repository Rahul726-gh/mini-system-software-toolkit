import fs from 'fs/promises';
import path from 'path';
import pool, { ensureDatabaseExists } from './database.js';

export default async function initDatabase() {
    await ensureDatabaseExists();

    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    await pool.query(schema);

    console.log('Database tables are ready.');
}
