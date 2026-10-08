import express from 'express';
import pool from '../config/database.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

const allowedModules = new Set([
    'lexical',
    'symbol-table',
    'two-pass-assembler',
    'recursive-parser',
    'quadruple'
]);

async function getOwnedProject(projectId, userId) {
    const result = await pool.query(
        `SELECT id, user_id, project_name, module_name, created_at, updated_at
         FROM projects
         WHERE id = $1 AND user_id = $2`,
        [projectId, userId]
    );

    return result.rows[0] || null;
}

router.post('/', authMiddleware, async (req, res) => {
    try {
        const projectName = String(req.body.projectName || '').trim();
        const moduleName = String(req.body.moduleName || '').trim();

        if (!projectName) {
            return res.status(400).json({ message: 'Project name is required.' });
        }

        if (!allowedModules.has(moduleName)) {
            return res.status(400).json({ message: 'Invalid module.' });
        }

        const result = await pool.query(
            `INSERT INTO projects (user_id, project_name, module_name)
             VALUES ($1, $2, $3)
             RETURNING id, project_name, module_name, created_at, updated_at`,
            [req.user.id, projectName, moduleName]
        );

        await pool.query(
            `INSERT INTO code_files (project_id, source_code)
             VALUES ($1, '')`,
            [result.rows[0].id]
        );

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create project error:', error);
        return res.status(500).json({ message: 'Unable to create project.' });
    }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        const moduleName = String(req.query.module || '').trim();

        if (moduleName && !allowedModules.has(moduleName)) {
            return res.status(400).json({ message: 'Invalid module.' });
        }

        const query = moduleName
            ? `SELECT id, project_name, module_name, created_at, updated_at
               FROM projects
               WHERE user_id = $1 AND module_name = $2
               ORDER BY updated_at DESC`
            : `SELECT id, project_name, module_name, created_at, updated_at
               FROM projects
               WHERE user_id = $1
               ORDER BY updated_at DESC`;

        const params = moduleName ? [req.user.id, moduleName] : [req.user.id];
        const result = await pool.query(query, params);

        return res.json(result.rows);
    } catch (error) {
        console.error('List projects error:', error);
        return res.status(500).json({ message: 'Unable to load projects.' });
    }
});

router.get('/:projectId/code', authMiddleware, async (req, res) => {
    try {
        const project = await getOwnedProject(req.params.projectId, req.user.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        const result = await pool.query(
            `SELECT source_code
             FROM code_files
             WHERE project_id = $1
             ORDER BY updated_at DESC, id DESC
             LIMIT 1`,
            [project.id]
        );

        let sourceCode = result.rows[0]?.source_code || '';

        // Recover code for older projects where the original save failed
        // but a Run already created an execution history entry.
        if (!sourceCode.trim()) {
            const executionResult = await pool.query(
                `SELECT source_code
                 FROM executions
                 WHERE project_id = $1
                 ORDER BY created_at DESC, id DESC
                 LIMIT 1`,
                [project.id]
            );

            sourceCode = executionResult.rows[0]?.source_code || '';
        }

        return res.json({
            project,
            sourceCode
        });
    } catch (error) {
        console.error('Load project code error:', error);
        return res.status(500).json({ message: 'Unable to load project code.' });
    }
});

router.put('/:projectId/code', authMiddleware, async (req, res) => {
    const client = await pool.connect();

    try {
        const sourceCode = String(req.body.sourceCode ?? '');
        const project = await getOwnedProject(req.params.projectId, req.user.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        await client.query('BEGIN');

        const existingCode = await client.query(
            `SELECT id
             FROM code_files
             WHERE project_id = $1
             ORDER BY id
             LIMIT 1`,
            [project.id]
        );

        if (existingCode.rows.length > 0) {
            await client.query(
                `UPDATE code_files
                 SET source_code = $1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [sourceCode, existingCode.rows[0].id]
            );
        } else {
            await client.query(
                `INSERT INTO code_files (project_id, source_code, updated_at)
                 VALUES ($1, $2, CURRENT_TIMESTAMP)`,
                [project.id, sourceCode]
            );
        }

        await client.query(
            `UPDATE projects
             SET updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_id = $2`,
            [project.id, req.user.id]
        );

        await client.query('COMMIT');

        return res.json({ message: 'Code saved successfully.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Save project code error:', error);
        return res.status(500).json({ message: 'Unable to save project code.' });
    } finally {
        client.release();
    }
});

export default router;
