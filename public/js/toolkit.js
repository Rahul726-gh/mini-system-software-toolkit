const token = localStorage.getItem('token');

if (!token) {
    window.location.href = '/login.html';
}

const params = new URLSearchParams(window.location.search);
const moduleName = params.get('module');
const projectIdFromUrl = params.get('projectId');

const moduleNames = {
    lexical: 'Lexical Analyzer',
    'symbol-table': 'Symbol Table',
    'two-pass-assembler': 'Two Pass Assembler',
    'recursive-parser': 'Recursive Descent Parser',
    quadruple: 'Quadruple Generator'
};

if (!moduleNames[moduleName]) {
    window.location.href = '/dashboard.html';
}

const moduleTitle = document.getElementById('moduleTitle');
const chooserTitle = document.getElementById('chooserTitle');
const projectChooser = document.getElementById('projectChooser');
const existingProjectsPanel = document.getElementById('existingProjectsPanel');
const editorPanel = document.getElementById('editorPanel');
const projectList = document.getElementById('projectList');
const projectNameInput = document.getElementById('projectName');
const sourceCodeInput = document.getElementById('sourceCode');
const outputElement = document.getElementById('output');
const historyElement = document.getElementById('history');
const statusMessage = document.getElementById('statusMessage');

moduleTitle.textContent = `• ${moduleNames[moduleName]}`;
chooserTitle.textContent = moduleNames[moduleName];

document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
});

function setStatus(message, type = '') {
    statusMessage.className = `message ${type}`;
    statusMessage.textContent = message;
}

async function api(url, options = {}) {
    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
    };

    if (options.body !== undefined && typeof options.body !== 'string') {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || 'Request failed.');
    }

    return data;
}

function showPanel(panel) {
    [projectChooser, existingProjectsPanel, editorPanel].forEach((item) => {
        item.classList.add('hidden');
    });
    panel.classList.remove('hidden');
}

function formatDate(value) {
    return new Date(value).toLocaleString();
}

function createCell(text, className = '') {
    const cell = document.createElement('td');
    cell.textContent = text ?? '';
    if (className) {
        cell.className = className;
    }
    return cell;
}

function createTable(columns, rows) {
    const wrapper = document.createElement('div');
    wrapper.className = 'result-table-wrapper';

    const table = document.createElement('table');
    table.className = 'result-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    columns.forEach((column) => {
        const th = document.createElement('th');
        th.textContent = column.label;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    rows.forEach((row) => {
        const tr = document.createElement('tr');

        columns.forEach((column) => {
            tr.appendChild(createCell(row[column.key]));
        });

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    wrapper.appendChild(table);

    return wrapper;
}

function createSection(title) {
    const section = document.createElement('section');
    section.className = 'result-section';

    const heading = document.createElement('h4');
    heading.textContent = title;
    section.appendChild(heading);

    return section;
}

function createMessage(text, className = 'result-message') {
    const element = document.createElement('p');
    element.className = className;
    element.textContent = text;
    return element;
}

function renderParseTree(node, parentElement, relation = '') {
    if (!node) {
        return;
    }

    const nodeElement = document.createElement('div');
    nodeElement.className = 'tree-node';

    const label = document.createElement('div');
    label.className = 'tree-node-label';

    if (node.type === 'BinaryExpression') {
        label.textContent = node.operator;
    } else if (node.type === 'Identifier') {
        label.textContent = node.name;
    } else if (node.type === 'NumberLiteral') {
        label.textContent = node.value;
    } else if (node.type === 'ParenthesizedExpression') {
        label.textContent = '( )';
    } else {
        label.textContent = node.type || relation || 'Node';
    }

    const type = document.createElement('small');
    type.textContent = node.type || '';
    label.appendChild(type);
    nodeElement.appendChild(label);

    parentElement.appendChild(nodeElement);

    if (node.type === 'BinaryExpression') {
        const children = document.createElement('div');
        children.className = 'tree-children';
        nodeElement.appendChild(children);
        renderParseTree(node.left, children, 'left');
        renderParseTree(node.right, children, 'right');
    } else if (node.type === 'ParenthesizedExpression') {
        const children = document.createElement('div');
        children.className = 'tree-children single-child';
        nodeElement.appendChild(children);
        renderParseTree(node.expression, children, 'expression');
    }
}

function renderParseTreeResult(result, container) {
    const section = createSection('Parse Tree');
    const tree = document.createElement('div');
    tree.className = 'parse-tree';
    renderParseTree(result.tree, tree);
    section.appendChild(tree);
    container.appendChild(section);
}

function renderResult(result) {
    outputElement.innerHTML = '';

    if (!result) {
        outputElement.appendChild(createMessage('No result.'));
        return;
    }

    if (result.success === false) {
        outputElement.appendChild(createMessage(result.message || 'Execution failed.', 'result-error'));
    }

    if (moduleName === 'lexical' && Array.isArray(result.tokens)) {
        const section = createSection('Tokens');
        section.appendChild(createTable(
            [
                { key: 'token', label: 'Token' },
                { key: 'type', label: 'Type' }
            ],
            result.tokens
        ));
        outputElement.appendChild(section);
        return;
    }

    if (moduleName === 'symbol-table' && Array.isArray(result.symbols)) {
        const section = createSection('Symbol Table');
        section.appendChild(createTable(
            [
                { key: 'name', label: 'Name' },
                { key: 'type', label: 'Type' },
                { key: 'value', label: 'Value' },
                { key: 'line', label: 'Line' }
            ],
            result.symbols
        ));

        if (result.errors?.length) {
            section.appendChild(createMessage(
                result.errors.map((error) => `Line ${error.line}: ${error.message}`).join('\n'),
                'result-error'
            ));
        }

        outputElement.appendChild(section);
        return;
    }

    if (moduleName === 'two-pass-assembler') {
        if (Array.isArray(result.symbolTable)) {
            const symbolSection = createSection('Pass 1 - Symbol Table');
            symbolSection.appendChild(createTable(
                [
                    { key: 'symbol', label: 'Symbol' },
                    { key: 'address', label: 'Address' }
                ],
                result.symbolTable
            ));
            outputElement.appendChild(symbolSection);
        }

        if (Array.isArray(result.intermediateCode)) {
            const intermediateSection = createSection('Pass 1 - Intermediate Code');
            intermediateSection.appendChild(createTable(
                [
                    { key: 'address', label: 'Address' },
                    { key: 'line', label: 'Source / Intermediate Code' }
                ],
                result.intermediateCode
            ));
            outputElement.appendChild(intermediateSection);
        }

        if (Array.isArray(result.machineCode)) {
            const machineSection = createSection('Pass 2 - Machine Code');
            machineSection.appendChild(createTable(
                [
                    { key: 'address', label: 'Address' },
                    { key: 'source', label: 'Source' },
                    { key: 'machineCode', label: 'Machine Code' }
                ],
                result.machineCode
            ));
            outputElement.appendChild(machineSection);
        }

        if (result.errors?.length) {
            outputElement.appendChild(createMessage(result.errors.join('\n'), 'result-error'));
        }
        return;
    }

    if (moduleName === 'recursive-parser' && result.tree) {
        outputElement.appendChild(createMessage(result.message || 'Parsing successful.', 'result-success'));
        renderParseTreeResult(result, outputElement);
        return;
    }

    if (moduleName === 'quadruple' && Array.isArray(result.quadruples)) {
        const section = createSection('Quadruple Table');
        const rows = result.quadruples.map((quadruple, index) => ({
            number: index + 1,
            ...quadruple
        }));

        section.appendChild(createTable(
            [
                { key: 'number', label: '#' },
                { key: 'operator', label: 'Operator' },
                { key: 'arg1', label: 'Arg1' },
                { key: 'arg2', label: 'Arg2' },
                { key: 'result', label: 'Result' }
            ],
            rows
        ));
        outputElement.appendChild(section);
        return;
    }

    const pre = document.createElement('pre');
    pre.className = 'raw-output';
    pre.textContent = JSON.stringify(result, null, 2);
    outputElement.appendChild(pre);
}

async function loadHistory(projectId) {
    historyElement.innerHTML = '<p class="muted">Loading history...</p>';

    try {
        const executions = await api(`/api/toolkit/projects/${projectId}/executions`);

        if (executions.length === 0) {
            historyElement.innerHTML = '<p class="muted">No executions yet.</p>';
            return;
        }

        historyElement.innerHTML = '';

        executions.forEach((execution, index) => {
            const item = document.createElement('article');
            item.className = 'history-item';

            const details = document.createElement('div');
            details.innerHTML = `
                <strong>Run #${executions.length - index}</strong>
                <small>${formatDate(execution.created_at)}</small>
            `;

            const viewButton = document.createElement('button');
            viewButton.className = 'button secondary';
            viewButton.textContent = 'View';

            const detailBox = document.createElement('div');
            detailBox.className = 'history-result hidden';
            detailBox.innerHTML = `
                <strong>Input / Source</strong>
                <div class="history-source"></div>
                <strong>Output</strong>
                <div class="history-source"></div>
            `;

            detailBox.querySelectorAll('.history-source')[0].textContent = execution.source_code;
            detailBox.querySelectorAll('.history-source')[1].textContent = JSON.stringify(execution.result, null, 2);

            viewButton.addEventListener('click', () => {
                detailBox.classList.toggle('hidden');
                viewButton.textContent = detailBox.classList.contains('hidden') ? 'View' : 'Hide';
            });

            const wrapper = document.createElement('div');
            wrapper.append(details, detailBox);

            item.append(wrapper, viewButton);
            historyElement.appendChild(item);
        });
    } catch (error) {
        historyElement.innerHTML = `<p class="message error">${error.message}</p>`;
    }
}

async function openProject(projectId) {
    try {
        const data = await api(`/api/projects/${projectId}/code`);

        currentProjectId = data.project.id;
        projectNameInput.value = data.project.project_name;
        sourceCodeInput.value = data.sourceCode;
        document.getElementById('editorTitle').textContent = data.project.project_name;
        outputElement.innerHTML = '<p class="muted">Run the project to see output.</p>';
        setStatus('');
        showPanel(editorPanel);
        await loadHistory(currentProjectId);
    } catch (error) {
        setStatus(error.message, 'error');
    }
}

async function loadExistingProjects() {
    projectList.innerHTML = '<p class="muted">Loading projects...</p>';
    showPanel(existingProjectsPanel);

    try {
        const projects = await api(`/api/projects?module=${encodeURIComponent(moduleName)}`);

        if (projects.length === 0) {
            projectList.innerHTML = '<p class="muted">No projects found for this module.</p>';
            return;
        }

        projectList.innerHTML = '';

        projects.forEach((project) => {
            const item = document.createElement('article');
            item.className = 'project-item';
            item.innerHTML = `
                <div>
                    <strong></strong>
                    <small>Updated: ${formatDate(project.updated_at)}</small>
                </div>
            `;

            item.querySelector('strong').textContent = project.project_name;

            const openButton = document.createElement('button');
            openButton.className = 'button primary';
            openButton.textContent = 'Open';
            openButton.addEventListener('click', () => openProject(project.id));

            item.appendChild(openButton);
            projectList.appendChild(item);
        });
    } catch (error) {
        projectList.innerHTML = `<p class="message error">${error.message}</p>`;
    }
}

let currentProjectId = projectIdFromUrl ? Number(projectIdFromUrl) : null;

async function createNewProject() {
    currentProjectId = null;
    projectNameInput.value = '';
    sourceCodeInput.value = '';
    outputElement.innerHTML = '<p class="muted">Run the project to see output.</p>';
    document.getElementById('editorTitle').textContent = 'New Project';
    setStatus('');
    historyElement.innerHTML = '<p class="muted">No executions yet.</p>';
    showPanel(editorPanel);
    projectNameInput.focus();
}

document.getElementById('newProjectButton').addEventListener('click', createNewProject);
document.getElementById('existingProjectButton').addEventListener('click', loadExistingProjects);
document.getElementById('backToChooserButton').addEventListener('click', () => showPanel(projectChooser));
document.getElementById('editorBackButton').addEventListener('click', () => showPanel(projectChooser));

document.getElementById('saveButton').addEventListener('click', async () => {
    const name = projectNameInput.value.trim();
    const sourceCode = sourceCodeInput.value;

    if (!name) {
        setStatus('Project name is required.', 'error');
        return;
    }

    try {
        setStatus('Saving...');

        if (!currentProjectId) {
            const project = await api('/api/projects', {
                method: 'POST',
                body: {
                    projectName: name,
                    moduleName
                }
            });

            currentProjectId = project.id;
        }

        await api(`/api/projects/${currentProjectId}/code`, {
            method: 'PUT',
            body: {
                sourceCode
            }
        });

        document.getElementById('editorTitle').textContent = name;
        setStatus('Code saved successfully.', 'success');
        await loadHistory(currentProjectId);
    } catch (error) {
        setStatus(error.message, 'error');
    }
});

document.getElementById('runButton').addEventListener('click', async () => {
    const sourceCode = sourceCodeInput.value;
    const name = projectNameInput.value.trim();

    if (!name) {
        setStatus('Project name is required before running.', 'error');
        return;
    }

    if (!sourceCode.trim()) {
        setStatus('Source code cannot be empty.', 'error');
        return;
    }

    try {
        setStatus('Running...');

        if (!currentProjectId) {
            const project = await api('/api/projects', {
                method: 'POST',
                body: {
                    projectName: name,
                    moduleName
                }
            });
            currentProjectId = project.id;
        }

        const data = await api(`/api/toolkit/projects/${currentProjectId}/run`, {
            method: 'POST',
            body: {
                sourceCode
            }
        });

        renderResult(data.result);
        setStatus('Execution completed.', 'success');
        await loadHistory(currentProjectId);
    } catch (error) {
        setStatus(error.message, 'error');
        outputElement.innerHTML = '<p class="result-error">Execution failed.</p>';
    }
});

if (currentProjectId) {
    openProject(currentProjectId);
}
