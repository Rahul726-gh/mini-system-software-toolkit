function tokenizeExpression(expression) {
    const tokens = [];
    let index = 0;

    while (index < expression.length) {
        const character = expression[index];

        if (/\s/.test(character)) {
            index += 1;
            continue;
        }

        if (/[A-Za-z_]/.test(character)) {
            const start = index;
            index += 1;
            while (index < expression.length && /[A-Za-z0-9_]/.test(expression[index])) {
                index += 1;
            }
            tokens.push({ type: 'operand', value: expression.slice(start, index) });
            continue;
        }

        if (/[0-9]/.test(character)) {
            const start = index;
            index += 1;
            while (index < expression.length && /[0-9.]/.test(expression[index])) {
                index += 1;
            }
            tokens.push({ type: 'operand', value: expression.slice(start, index) });
            continue;
        }

        if ('+-*/()'.includes(character)) {
            tokens.push({ type: character, value: character });
            index += 1;
            continue;
        }

        throw new Error(`Invalid character: ${character}`);
    }

    return tokens;
}

function precedence(operator) {
    if (operator === '+' || operator === '-') {
        return 1;
    }
    if (operator === '*' || operator === '/') {
        return 2;
    }
    return 0;
}

function toPostfix(tokens) {
    const output = [];
    const operators = [];

    for (const token of tokens) {
        if (token.type === 'operand') {
            output.push(token.value);
            continue;
        }

        if (token.type === '(') {
            operators.push(token.value);
            continue;
        }

        if (token.type === ')') {
            while (operators.length > 0 && operators.at(-1) !== '(') {
                output.push(operators.pop());
            }

            if (operators.pop() !== '(') {
                throw new Error('Mismatched parentheses.');
            }
            continue;
        }

        while (
            operators.length > 0 &&
            operators.at(-1) !== '(' &&
            precedence(operators.at(-1)) >= precedence(token.value)
        ) {
            output.push(operators.pop());
        }

        operators.push(token.value);
    }

    while (operators.length > 0) {
        const operator = operators.pop();
        if (operator === '(') {
            throw new Error('Mismatched parentheses.');
        }
        output.push(operator);
    }

    return output;
}

function generateForExpression(expression, resultName, quadruples, tempCounter) {
    const tokens = tokenizeExpression(expression);
    const postfix = toPostfix(tokens);
    const stack = [];

    for (const item of postfix) {
        if (!'+-*/'.includes(item)) {
            stack.push(item);
            continue;
        }

        const right = stack.pop();
        const left = stack.pop();

        if (left === undefined || right === undefined) {
            throw new Error('Invalid expression.');
        }

        const temporary = `t${tempCounter.value}`;
        tempCounter.value += 1;

        quadruples.push({
            operator: item,
            arg1: left,
            arg2: right,
            result: temporary
        });

        stack.push(temporary);
    }

    if (stack.length !== 1) {
        throw new Error('Invalid expression.');
    }

    const finalValue = stack[0];

    quadruples.push({
        operator: '=',
        arg1: finalValue,
        arg2: '-',
        result: resultName
    });
}

function parseStatement(statement) {
    const assignmentIndex = statement.indexOf('=');

    if (assignmentIndex <= 0) {
        throw new Error(`Invalid assignment: ${statement}`);
    }

    return {
        target: statement.slice(0, assignmentIndex).trim(),
        expression: statement.slice(assignmentIndex + 1).trim()
    };
}

export function generateQuadruples(source) {
    try {
        const statements = source
            .split(';')
            .map((statement) => statement.trim())
            .filter(Boolean);

        const quadruples = [];
        const tempCounter = { value: 1 };

        for (const statement of statements) {
            const { target, expression } = parseStatement(statement);
            generateForExpression(expression, target, quadruples, tempCounter);
        }

        return {
            success: true,
            quadruples
        };
    } catch (error) {
        return {
            success: false,
            quadruples: [],
            message: error.message
        };
    }
}

export default generateQuadruples;
