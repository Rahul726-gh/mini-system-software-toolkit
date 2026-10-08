const declarationPattern = /^(int|float|double|char)\s+([A-Za-z_]\w*)\s*(?:=\s*(.+?))?\s*;?$/;

function cleanValue(value, type) {
    if (value === undefined || value === '') {
        return '';
    }

    let cleaned = value.trim();

    if (type === 'char' && cleaned.length >= 2 &&
        ((cleaned.startsWith("'") && cleaned.endsWith("'")) ||
         (cleaned.startsWith('"') && cleaned.endsWith('"')))) {
        cleaned = cleaned.slice(1, -1);
    }

    return cleaned;
}

function parseDeclaration(line, lineNumber) {
    const match = line.trim().match(declarationPattern);

    if (!match) {
        return null;
    }

    const [, type, name, rawValue] = match;

    return {
        name,
        type,
        value: cleanValue(rawValue, type),
        line: lineNumber
    };
}

export function generateSymbolTable(source) {
    const symbols = [];
    const errors = [];
    const seen = new Set();
    const lines = source.split(/\r?\n/);

    lines.forEach((line, index) => {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('//')) {
            return;
        }

        const symbol = parseDeclaration(trimmed, index + 1);

        if (!symbol) {
            errors.push({
                line: index + 1,
                message: 'Not a supported declaration.'
            });
            return;
        }

        if (seen.has(symbol.name)) {
            errors.push({
                line: index + 1,
                message: `Duplicate declaration: ${symbol.name}`
            });
            return;
        }

        seen.add(symbol.name);
        symbols.push(symbol);
    });

    return {
        success: errors.length === 0,
        symbols,
        errors
    };
}

export default generateSymbolTable;
