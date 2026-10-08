const keywords = new Set([
    'int', 'float', 'char', 'double', 'if', 'else',
    'while', 'for', 'return'
]);

const twoCharacterOperators = new Set(['==', '!=', '<=', '>=']);
const oneCharacterOperators = new Set(['+', '-', '*', '/', '=', '<', '>']);
const separators = new Set([';', ',', '(', ')', '{', '}', '[', ']']);

function isLetter(character) {
    return /[A-Za-z_]/.test(character);
}

function isDigit(character) {
    return /[0-9]/.test(character);
}

function readIdentifier(source, start) {
    let index = start;

    while (index < source.length && /[A-Za-z0-9_]/.test(source[index])) {
        index += 1;
    }

    const value = source.slice(start, index);
    return {
        value,
        nextIndex: index,
        type: keywords.has(value) ? 'KEYWORD' : 'IDENTIFIER'
    };
}

function readNumber(source, start) {
    let index = start;
    let decimalPointSeen = false;

    while (index < source.length) {
        const character = source[index];

        if (isDigit(character)) {
            index += 1;
            continue;
        }

        if (character === '.' && !decimalPointSeen) {
            decimalPointSeen = true;
            index += 1;
            continue;
        }

        break;
    }

    return {
        value: source.slice(start, index),
        nextIndex: index
    };
}

export function analyze(source) {
    const tokens = [];
    let index = 0;

    while (index < source.length) {
        const character = source[index];

        if (/\s/.test(character)) {
            index += 1;
            continue;
        }

        if (character === '/' && source[index + 1] === '/') {
            index += 2;
            while (index < source.length && source[index] !== '\n') {
                index += 1;
            }
            continue;
        }

        if (isLetter(character)) {
            const token = readIdentifier(source, index);
            tokens.push({
                token: token.value,
                type: token.type
            });
            index = token.nextIndex;
            continue;
        }

        if (isDigit(character)) {
            const number = readNumber(source, index);
            tokens.push({
                token: number.value,
                type: 'NUMBER'
            });
            index = number.nextIndex;
            continue;
        }

        const twoCharacter = source.slice(index, index + 2);
        if (twoCharacterOperators.has(twoCharacter)) {
            tokens.push({ token: twoCharacter, type: 'OPERATOR' });
            index += 2;
            continue;
        }

        if (oneCharacterOperators.has(character)) {
            tokens.push({ token: character, type: 'OPERATOR' });
            index += 1;
            continue;
        }

        if (separators.has(character)) {
            tokens.push({ token: character, type: 'SEPARATOR' });
            index += 1;
            continue;
        }

        tokens.push({
            token: character,
            type: 'UNKNOWN'
        });
        index += 1;
    }

    return {
        success: true,
        tokens,
        count: tokens.length
    };
}

export default analyze;
