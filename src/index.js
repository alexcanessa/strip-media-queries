'use strict';

const minimist = require('minimist')(process.argv.slice(2));
const chalk = require('chalk');
const Stripper = require('./stripper');

const stripper = new Stripper(minimist);

stripper.launch()
    .then(() => {
        console.log(`\n${chalk.green('All done!')}`);
    });
