#!/usr/bin/env ../../run.js

@{grab({module: 'lodash', alias: '_', dev: true})}
@{grab({module: 'http-server'})}
@{grab({module: 'moment'})}
@{grab({module: 'express', dev: true})}
@{grab({module: 'colors'})}
@{grab({module: 'react'})}
@{grab({module: 'react-addons-update'})}
@{take({module: 'lodash', alias: '_2', dev: true})}

console.log(_.map([1, 2, 3], e => e * 2));

console.log(_2.filter([1, 2, 3, 4, 5], e => e % 2));

console.log(moment().format());

console.log(colors.red.underline('i like cake and pies'));
console.log('i like cake and pies'.red.underline);
