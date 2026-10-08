import express from 'express';
import pool from '../config/database.js';
import authMiddleware from '../middleware/authMiddleware.js';
import analyzeLexical from '../modules/lexicalAnalyzer.js';
import generateSymbolTable from '../modules/symbolTable.js';
import assemble from '../modules/twoPassAssembler.js';
import parseExpression from '../modules/recursiveDescentParser.js';
import generateQuadruples from '../modules/quadrupleGenerator.js';

const router = express.Router();

async function getOwnedProject(projectId, userId) {
    const result = await pool.query(
        `SELECT id, project_name, module_name
         FROM projects
         WHERE id = $1 AND user_id = $2`,
        [projectId, userId]
    );

    return result.rows[0] || null;
}

function executeModule(moduleName, sourceCode) {
    switch (moduleName) {
        case 'lexical':
            return analyzeLexical(sourceCode);
        case 'symbol-table':
            return generateSymbolTable(sourceCode);
        case 'two-pass-assembler':
            return assemble(sourceCode);
        case 'recursive-parser':
            return parseExpression(sourceCode);
        case 'quadruple':
            return generateQuadruples(sourceCode);
        default:
            throw new Error('Unsupported module.');
    }
}

router.post('/projects/:projectId/run', authMiddleware, async (req, res) => {
    try {
        const project = await getOwnedProject(req.params.projectId, req.user.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        const sourceCode = String(req.body.sourceCode ?? '');

        if (!sourceCode.trim()) {
            return res.status(400).json({ message: 'Source code cannot be empty.' });
        }

        const result = executeModule(project.module_name, sourceCode);

        const execution = await pool.query(
            `INSERT INTO executions (project_id, source_code, result)
             VALUES ($1, $2, $3::jsonb)
             RETURNING id, created_at`,
            [project.id, sourceCode, JSON.stringify(result)]
        );

        return res.json({
            executionId: execution.rows[0].id,
            createdAt: execution.rows[0].created_at,
            result
        });
    } catch (error) {
        console.error('Run module error:', error);
        return res.status(500).json({ message: error.message || 'Execution failed.' });
    }
});

router.get('/projects/:projectId/executions', authMiddleware, async (req, res) => {
    try {
        const project = await getOwnedProject(req.params.projectId, req.user.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        const result = await pool.query(
            `SELECT id, source_code, result, created_at
             FROM executions
             WHERE project_id = $1
             ORDER BY created_at DESC, id DESC`,
            [project.id]
        );

        return res.json(result.rows);
    } catch (error) {
        console.error('Execution history error:', error);
        return res.status(500).json({ message: 'Unable to load execution history.' });
    }
});

export default router;
