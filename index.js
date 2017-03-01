#!/usr/bin/env node

'use strict';
const fs = require('fs');

// 2 passes:
// 1st: collect definitions
// 2nd: perform substitutions

// TODO: the @ should be parametrizable
const identifierRegExp = /^([a-zA-Z_$][0-9a-zA-Z_$]*)/gmu;
const macroSpaceRegExp = /@\s*/gmu;

// index is the index of the opening paren
function matchParens(source, index, open, close) {
    let count = 1, value = '';

    if (source[index] !== open) return Promise.resolve({ index, value: null });

    // this works on multiple lines
    // so we slice source and not line
    for (let i = index + 1; i < source.length; ++i) {
        let ch = source[i];

        if (ch === close) --count;
        else if (ch === open) ++count;

        if (count === 0) {
            // returned index is the index of the character after the closing paren
            // value is the stuff between parens, excluding themselves
            return Promise.resolve({ index: i + 1, value });
        }

        // doesn't include outer ( and ):
        value += ch;
    }

    return Promise.resolve({ index, value: null });
}

// todo: ditch the regexps
function isLetter(ch) {
    return /[a-zA-Z]/.test(ch);
}

function isUnderscoreOrDollar(ch) {
    return /\$_/.test(ch);
}

function isNumber(ch) {
    return /[0-9]/.test(ch);
}

function matchIdentifier(source, index) {
    let value = '';

    const firstCh = source[index];

    if (!isLetter(firstCh) && !isUnderscoreOrDollar(firstCh))
        return Promise.reject(`Expected identifier at ${index}!`);

    value += firstCh;

    for (let i = index + 1; i < source.length; ++i) {
        const ch = source[i];
        if (!isLetter(ch) && !isUnderscoreOrDollar(ch) && !isNumber(ch))
            return Promise.resolve({value, index: i});
        value += ch;
    }

    return Promise.resolve({value, index});
}

// returns index of the first nonspace character
function eatSpace(source, index) {
    let value = '';
    for (let i = index; i < source.length; ++i) {
        let ch = source[i];
        if (!' \n\t\v'.includes(ch)) {
            return Promise.resolve({index: i, value});
        }
        value += ch;
    }
    return Promise.resolve({index, value});
}

// todo: make this async
// cb returns a promise
function applyRegex(source, regExp, cb) {
    let matches, result = '', partial = '';
    let lastEndIndex = 0;

    while ((matches = regExp.exec(source))) {
        const macroName = matches[1];
        const startIndex = matches.index;

        let index = startIndex + matches[0].length;

        partial = source.slice(lastEndIndex, startIndex);
        let x = cb(source, index, macroName, partial);
        result += partial + x.value;

        lastEndIndex = x.index;
        regExp.lastIndex = lastEndIndex;
    }

    cb(source, lastEndIndex, '', source.slice(lastEndIndex));
    result += source.slice(lastEndIndex);
    return result;
}

const stringifyPartial = (partial) => {
    let stringified = '', lastI = 0;
    for (let i = 0; i < partial.length; ++i) {
        let ch = partial[i];

        if (ch === '@') {
            stringified += partial.slice(lastI, i) + '`';

            i = eatSpace(partial, i + 1);
            const args = matchParens(partial, i, '{', '}');
            i = args.index;
            const val = args.match;

            stringified += processMacros(val).output + '`';

            lastI = i;
        }
    }
    stringified += partial.slice(lastI);

    return stringified;
    // change @{x} to `x`
    // if macros should work recursively, it would be @{x} -> `y`, where y = self(x)
};

const escapeBackticks = str => {
    str = str.replace(/\\/g, '\\\\');
    str = str.replace(/\$/g, '\\$');
    return str.replace(/`/g, '\\`');
};

var processMacros = (source) => {
    let macros = [];

    let generator = '';

    let compiled = applyRegex(source, macroSpaceRegExp, (source, index, macroName, partial) => {
        partial = escapeBackticks(partial);

        let expr = '';
        const alt = ({value, index}) => matchIdentifier(source, index)
        .then(({value, index}) => { expr += value; return eatSpace(source, index); })
        .then(({value, index}) => matchParens(source, index, '(', ')'))
        .then(({value, index}) => {
            expr += `(${value})`;
            const strValue = stringifyPartial(expr);
            generator += `output += \`${partial}\${${strValue}}\`;\n\n`;
            return { index, value: '***' };
        });

        return matchParens(source, index, '{', '}')
        .then(({value, index}) => {
            const strValue = stringifyPartial(value);

            if (/\s*((async\s+)?function\*?)|const|var|let|class|if\s+/.test(strValue)) {
                generator += `output += \`${partial}\`;\n\n${strValue}\n\n`;
            } else {
                generator += `output += \`${partial}\${${strValue}}\`;\n\n`;
            }

            return { index, value: '***' };
        })
        .catch(({value, index}) => alt({value, index}));
    });

    //generator += `output += \`${source.slice()}\`;`;

    let gen = String.raw`(() => {
        ${fs.readFileSync(require.resolve('./core-macros.js'), 'utf-8')}
        let output = '';
        ${generator}
        return output;
    })()`;
    return { generator: gen, output: eval(gen) };
};

//const self = callable({args: 'fileName', body: c=> [
//    _=> fs.readFile(c.fileName, 'utf-8', c.next), // c.try instead of c.next
//    (err, source) => {
//        if (err) throw err;
//        const output = processMacros(source);
//        console.log(output);
//        c.return(output);
//    }
//]});

const self = (fileName, onReturn) => {
    let funs = [
        _ => fs.readFile(fileName, 'utf-8', funs[1]),
        (err, source) => {
            if (err) throw err;
            const { output, generator } = processMacros(source);
            //console.log(output);
            onReturn(output);
        }
    ];
    funs[0]();
};

module.exports = self;

if (require.main === module) {
    //const argsString = '[' + process.argv.slice(2).join('') + ']';
    //const args = JSON.parse(argsString);
    self(process.argv[2], ret => console.log(ret));
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements

// todo: make async work; async macros
// alternative (dual-like) syntax