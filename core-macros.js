const _ = '@';

const escapeTemplate = str => {
    str = str.replace(/\\/g, '\\\\');
    str = str.replace(/\$/g, '\\$');
    return str.replace(/`/g, '\\`');
};

const escapeRawTemplate = str => {
    str = str.replace(/\$/g, '\\$');
    return str.replace(/`/g, '\\`');
};

function include(fileName) {
    const fs = require('fs');

    // either return a promise to be async
    // or require a callback
    return fs.readFileSync(fileName, 'utf-8');
    // todo: preprocess the included file before including it?
}

function toIdentifier(name) {
    // todo: implement properly
    return name.replace(/-/g, '_');
}

function npmInit() {
    // todo: `npm init -f`
}

function simpleScript() {
    // todo
    return '';
}

function grab({
        module = '',
        alias = toIdentifier(module),
        save = true,
        dev = false,
        onReturn = null,
        async = false // if true, this returns a promise resolved when the module is installed
    }) {
    let exec = require('child_process').exec;
    if (module === '') throw Error('Module name is required!');

    // todo: make it possible to be async by returning a promise or accepting a callback

    exec(`node -p "try { require('${module}/package.json').version } catch (e) { 'missing' }"`, (e, so, se) => {
        // install only if not already installed
        // todo: support version bumping
        const moduleVersion = so.slice(0, -1);
        //console.log(module, moduleVersion);
        if (moduleVersion === 'missing') {
            const command = `npm install ${save? `--save${dev? '-dev': ''}`: ''} ${module}`;
            //console.log('***\n', command, '\n***');
            [exec(command)].map(c => {
                c.stdout.pipe(process.stdout);
                c.stderr.pipe(process.stderr);
            });
        }
    });

    return `const ${alias} = require('${module}');`;
}

// todo: integrate with grab. Add simpleScript, which will change global defaults (e.g. grab will download modules to ~/.jstpp/modules).
function take({
        module = '',
        alias = toIdentifier(module),
        save = true,
        dev = false,
        onReturn = null,
        async = false, // if true, this returns a promise resolved when the module is installed
        suffix = ''
    }) {
    const exec = require('child_process').exec;
    const path = require('path');
    if (module === '') throw Error('Module name is required!');

    // todo: make it possible to be async by returning a promise or accepting a callback
    const cwd = path.resolve(`${process.env.HOME}/.jstpp/modules`);
    //console.log(cwd);

    exec(`mkdir -p ${cwd}`);

    exec(`node -p "try { require('${module}/package.json').version } catch (e) { 'missing' }"`,
    { cwd },
    (e, so, se) => {
        // install only if not already installed
        // todo: support version bumping
        const moduleVersion = so.slice(0, -1);
        //console.log(module, moduleVersion);
        if (moduleVersion === 'missing') {
            const command = `npm install ${module}`;
            //console.log('***\n', command, '\n***');
            [exec(command, { cwd })].map(c => {
                c.stdout.pipe(process.stdout);
                c.stderr.pipe(process.stderr);
            });
        }
    });

    return `const ${alias} = require('${cwd}/node_modules/${module}${suffix}');`;
}
