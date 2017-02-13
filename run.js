#!/usr/bin/env node

const jstpp = require('./index');
const fs = require('fs');
const exec = require('child_process').exec;

jstpp(process.argv[2], ret => {
    fs.writeFile('_jstpp_temp_.js', ret, e => {
        const p = exec('node _jstpp_temp_.js', (e, so, se) => {
            exec('rm _jstpp_temp_.js', (e, so, se) => console.log(so, se));
        });
        p.stdout.pipe(process.stdout);
        p.stderr.pipe(process.stderr);
    });
});
