class Parser {
    constructor(source) {
        this.tokens = this.tokenize(source);
        this.position = 0;
    }

    tokenize(source) {
        const tokens = [];
        let index = 0;

        while (index < source.length) {
            const character = source[index];

            if (/\s/.test(character)) {
                index += 1;
                continue;
            }

            if (/[A-Za-z_]/.test(character)) {
                const start = index;
                index += 1;
                while (index < source.length && /[A-Za-z0-9_]/.test(source[index])) {
                    index += 1;
                }
                tokens.push({ type: 'identifier', value: source.slice(start, index) });
                continue;
            }

            if (/[0-9]/.test(character)) {
                const start = index;
                index += 1;
                while (index < source.length && /[0-9.]/.test(source[index])) {
                    index += 1;
                }
                tokens.push({ type: 'number', value: source.slice(start, index) });
                continue;
            }

            if ('+-*/()'.includes(character)) {
                tokens.push({ type: character, value: character });
                index += 1;
                continue;
            }

            throw new Error(`Invalid character: ${character}`);
        }

        tokens.push({ type: 'EOF', value: 'EOF' });
        return tokens;
    }

    current() {
        return this.tokens[this.position];
    }

    consume(type) {
        if (this.current().type !== type) {
            throw new Error(`Expected ${type} but found ${this.current().value}`);
        }
        const token = this.current();
        this.position += 1;
        return token;
    }

    parseExpression() {
        let node = this.parseTerm();

        while (this.current().type === '+' || this.current().type === '-') {
            const operator = this.consume(this.current().type).value;
            const right = this.parseTerm();
            node = {
                type: 'BinaryExpression',
                operator,
                left: node,
                right
            };
        }

        return node;
    }

    parseTerm() {
        let node = this.parseFactor();

        while (this.current().type === '*' || this.current().type === '/') {
            const operator = this.consume(this.current().type).value;
            const right = this.parseFactor();
            node = {
                type: 'BinaryExpression',
                operator,
                left: node,
                right
            };
        }

        return node;
    }

    parseFactor() {
        const token = this.current();

        if (token.type === 'number') {
            this.consume('number');
            return {
                type: 'NumberLiteral',
                value: token.value
            };
        }

        if (token.type === 'identifier') {
            this.consume('identifier');
            return {
                type: 'Identifier',
                name: token.value
            };
        }

        if (token.type === '(') {
            this.consume('(');
            const expression = this.parseExpression();
            this.consume(')');
            return {
                type: 'ParenthesizedExpression',
                expression
            };
        }

        throw new Error(`Unexpected token: ${token.value}`);
    }

    parse() {
        const tree = this.parseExpression();

        if (this.current().type !== 'EOF') {
            throw new Error(`Unexpected token: ${this.current().value}`);
        }

        return tree;
    }
}

export function parseExpression(source) {
    try {
        const parser = new Parser(source);
        const tree = parser.parse();

        return {
            success: true,
            message: 'Parsing successful.',
            tree
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            tree: null
        };
    }
}

export default parseExpression;
