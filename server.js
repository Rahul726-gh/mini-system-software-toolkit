import express from 'express';
import dotenv from 'dotenv';
import pool from './config/database.js';
import initDatabase from './config/initDatabase.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import toolkitRoutes from './routes/toolkitRoutes.js';
import authMiddleware from './middleware/authMiddleware.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/public/index.html');
});

app.get('/db-test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() AS time');
        res.json({
            message: 'Database connected successfully.',
            time: result.rows[0].time
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Database connection failed.' });
    }
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/toolkit', toolkitRoutes);

app.get('/protected-test', authMiddleware, (req, res) => {
    res.json({
        message: 'You are authenticated.',
        user: req.user
    });
});

app.use((req, res) => {
    res.status(404).json({ message: 'Route not found.' });
});

async function startServer() {
    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is missing from the environment.');
        }

        await initDatabase();

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Server startup failed:', error.message);
        console.error('Check PostgreSQL, database credentials, and .env settings.');
        process.exit(1);
    }
}

startServer();
