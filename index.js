#!/usr/bin/env node

'use strict';
const fs = require('fs');

// 2 passes:
// 1st: collect definitions
// 2nd: perform substitutions

// index is the index of the opening paren
function matchParens(source, index, open, close) {
    let count = 1, match = '';

    if (source[index] !== open) return null;

    // this works on multiple lines
    // so we slice source and not line
    for (let i = index + 1; i < source.length; ++i) {
        let ch = source[i];

        if (ch === close) --count;
        else if (ch === open) ++count;

        if (count === 0) {
            index = i + 1;
            // returned index is the index of closing paren
            // match is the stuff between parens, excluding themselves
            return { index, match };
        }

        // doesn't include outer ( and ):
        match += ch;
    }

    return null;
}

// returns index of the first nonspace character
function eatSpace(source, index) {
    for (let i = index; i < source.length; ++i) {
        let ch = source[i];
        if (!' \n\t\v'.includes(ch)) {
            return i;
        }
    }
    return index;
}

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

    // TODO: the @ should be parametrizable
    const macroDefRegExp = /^\s*@\s*function\s+([a-zA-Z_$]*)\s*/gmu;
    const macroInvRegExp = /@\s*([a-zA-Z_$]*)\s*/gmu;
    const macroSpaceRegExp = /@\s*/gmu;

    let generator = '';

    let compiled = applyRegex(source, macroSpaceRegExp, (source, index, macroName, partial) => {
        const args = matchParens(source, index, '{', '}');

        partial = escapeBackticks(partial);

        // macro has the form @x
        if (args === null) {
            //console.log('***');
            generator += `output += \`${partial}\`;`;
            return { index, value: '***' };
        // macro has the form @{x}
        } else {
            index = args.index;
        }

        let val = args.match;

        //console.log('P', partial, 'V', val)
        val = stringifyPartial(val);
        //console.log('SV', val);
        if (/\s*((async\s+)?function\*?)|const|var|let|class|if\s+/.test(val)) {
            generator += `output += \`${partial}\`;\n\n${val}\n\n`;
        } else {
            generator += `output += \`${partial}\${${val}}\`;\n\n`;
        }

        return { index, value: '***' };
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
