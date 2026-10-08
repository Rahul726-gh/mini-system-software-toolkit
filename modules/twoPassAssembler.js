const instructionSet = {
    READ: '01',
    PRINT: '02',
    MOVER: '03',
    MOVEM: '04',
    ADD: '05',
    SUB: '06',
    MULT: '07',
    DIV: '08',
    STOP: '09'
};

const registerCodes = {
    AREG: '1',
    BREG: '2',
    CREG: '3',
    DREG: '4'
};

function normalizeLine(line) {
    return line.split(';')[0].trim();
}

function parseInstruction(line) {
    const parts = line.replace(/,/g, ' ').split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
        return null;
    }

    return {
        opcode: parts[0].toUpperCase(),
        operands: parts.slice(1).map((operand) => operand.toUpperCase())
    };
}

function parseDataDefinition(line) {
    const match = line.match(/^([A-Za-z_]\w*)\s+(DC|DS)\s+(.+)$/i);

    if (!match) {
        return null;
    }

    return {
        label: match[1].toUpperCase(),
        directive: match[2].toUpperCase(),
        value: match[3].trim()
    };
}

function parseLine(line) {
    const cleaned = normalizeLine(line);

    if (!cleaned) {
        return null;
    }

    const dataDefinition = parseDataDefinition(cleaned);
    if (dataDefinition) {
        return {
            kind: 'data',
            ...dataDefinition
        };
    }

    const colonIndex = cleaned.indexOf(':');
    if (colonIndex >= 0) {
        const label = cleaned.slice(0, colonIndex).trim().toUpperCase();
        const rest = cleaned.slice(colonIndex + 1).trim();

        if (!rest) {
            return { kind: 'label', label };
        }

        return {
            kind: 'instruction',
            label,
            ...parseInstruction(rest)
        };
    }

    return {
        kind: 'instruction',
        ...parseInstruction(cleaned)
    };
}

function firstPass(lines) {
    const symbols = {};
    const intermediate = [];
    let address = 0;
    let started = false;

    for (const [index, originalLine] of lines.entries()) {
        const parsed = parseLine(originalLine);
        if (!parsed) {
            continue;
        }

        if (parsed.kind === 'instruction' && parsed.opcode === 'START') {
            started = true;
            intermediate.push({ address: '-', line: index + 1, code: originalLine.trim() });
            continue;
        }

        if (parsed.kind === 'instruction' && parsed.opcode === 'END') {
            intermediate.push({ address: '-', line: index + 1, code: originalLine.trim() });
            continue;
        }

        if (parsed.label) {
            symbols[parsed.label] = address;
        }

        if (parsed.kind === 'data') {
            symbols[parsed.label] = address;
            const size = parsed.directive === 'DS' ? Number(parsed.value) || 1 : 1;
            intermediate.push({
                address,
                line: index + 1,
                code: originalLine.trim(),
                kind: 'data'
            });
            address += size;
            continue;
        }

        if (parsed.kind === 'label') {
            continue;
        }

        if (parsed.kind === 'instruction') {
            intermediate.push({
                address,
                line: index + 1,
                code: originalLine.trim(),
                parsed,
                started
            });
            address += 1;
        }
    }

    return { symbols, intermediate };
}

function resolveOperand(operand, symbols) {
    if (!operand) {
        return '000';
    }

    if (/^\d+$/.test(operand)) {
        return operand.padStart(3, '0');
    }

    if (Object.prototype.hasOwnProperty.call(symbols, operand)) {
        return String(symbols[operand]).padStart(3, '0');
    }

    return operand;
}

function secondPass(intermediate, symbols) {
    const machineCode = [];
    const errors = [];

    for (const item of intermediate) {
        if (item.kind === 'data') {
            const parsed = parseDataDefinition(item.code);
            const value = parsed.directive === 'DC' ? parsed.value : '000';
            machineCode.push({
                address: item.address,
                machineCode: value,
                source: item.code
            });
            continue;
        }

        if (!item.parsed) {
            continue;
        }

        const { opcode, operands } = item.parsed;

        if (opcode === 'START' || opcode === 'END') {
            continue;
        }

        const operationCode = instructionSet[opcode];

        if (!operationCode) {
            errors.push(`Line ${item.line}: Unknown instruction ${opcode}`);
            machineCode.push({
                address: item.address,
                machineCode: 'ERROR',
                source: item.code
            });
            continue;
        }

        let register = '0';
        let operand = '000';

        if (operands.length > 0 && registerCodes[operands[0]]) {
            register = registerCodes[operands[0]];
            operand = resolveOperand(operands[1], symbols);
        } else if (operands.length > 0) {
            operand = resolveOperand(operands[0], symbols);
        }

        if (/[A-Za-z_]/.test(operand) && !Object.prototype.hasOwnProperty.call(symbols, operand)) {
            errors.push(`Line ${item.line}: Undefined symbol ${operand}`);
        }

        machineCode.push({
            address: item.address,
            machineCode: `${operationCode} ${register} ${operand}`,
            source: item.code
        });
    }

    return { machineCode, errors };
}

export function assemble(source) {
    const lines = source.split(/\r?\n/);
    const passOne = firstPass(lines);
    const passTwo = secondPass(passOne.intermediate, passOne.symbols);

    return {
        success: passTwo.errors.length === 0,
        symbolTable: Object.entries(passOne.symbols).map(([symbol, address]) => ({ symbol, address })),
        intermediateCode: passOne.intermediate.map((item) => ({
            address: item.address,
            line: item.line,
            code: item.code
        })),
        machineCode: passTwo.machineCode,
        errors: passTwo.errors
    };
}

export default assemble;
