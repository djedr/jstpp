#!/usr/bin/env ../run.js

@{take({module: 'lodash', alias: '_'})}
@{take({module: 'colors'})}
@{take({module: 'moment'})}
@{take({module: 'chalk'})}

console.log(_.filter([1, 2, 3, 4, 5], e => e % 2));
console.log('hi'.red);
console.log('i like cake and pies'.red.underline);
console.log(moment());

console.log(chalk.blue('Hello world!'));