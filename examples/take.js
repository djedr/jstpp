#!/usr/bin/env ../run.js

@{take({module: 'lodash', alias: '_'})}

console.log(_.filter([1, 2, 3, 4, 5], e => e % 2));
