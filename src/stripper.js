'use strict';

const fs = require('fs');
const css = require('css');
const assign = require('deep-assign');
const chalk = require('chalk');
const filters = {
    strip: filterMediaQueries,
    original: filterNonMediaQueries
};
const defaults = {
    width: '1200',
    outputFile: 'media-queries.css',
    overrideOriginal: false,
    strippedSuffix: 'stripped'
};

/**
 * Get the path of a given filename
 *
 * @param  {string} filename
 *
 * @return {string}
 */
function getFilePath(filename) {
    return filename
        .split('/')
        .slice(0, -1)
        .join('/');
}

/**
 * Filter a css rule based on media width
 *
 * @param  {string} width
 * @param  {Object} rule
 *
 * @return {boolean}
 */
function filterMediaQueries(width, rule) {
    return rule.type === 'rule' || rule.type === 'media' && !rule.media.match(`${width}px`);
}

/**
 * Filter a css rule based on media width
 *
 * @param  {string} width
 * @param  {Object} rule
 *
 * @return {boolean}
 */
function filterNonMediaQueries(width, rule) {
    return rule.type === 'media' && rule.media.match(`${width}px`);
}

/**
 * Strip a file based on a width and using a certain filter function
 *
 * @param  {string} filename
 * @param  {string} width
 * @param  {string} filter
 *
 * @return {string}
 */
function stripFile(instance, filter) {
    let cssFile = css.parse(fs.readFileSync(instance.options.filename, 'utf-8'));
    let strippedContent = cssFile.stylesheet.rules.filter(filters[filter].bind(null, instance.options.width));

    console.log(`${strippedContent.length} rule found for the ${filter} function`);

    cssFile.stylesheet.rules = strippedContent;

    return css.stringify(cssFile);
}

/**
 * Write the stripped css file
 *
 * @param  {string} filename
 * @param  {string} width
 *
 * @return {Promise}
 */
function writeStrippedFile(instance) {
    let path = instance.options.filename;

    if (!instance.options.overrideOriginal) {
        let suffix = instance.options.strippedSuffix.replace(/\.css$|\./g, '');

        path = path.replace('.css', `.${suffix}.css`);
    }

    console.log(chalk.blue(`\n=== Writing ${path} ===`));

    let notMediaQueriesFile = stripFile(instance, 'strip');

    return new Promise((resolve, reject) => {
        fs.writeFile(path, notMediaQueriesFile, 'utf-8', error => {
            if (error) {
                reject();
            }

            resolve();
        });
    });
}

/**
 * Write the media queries css file
 *
 * @param  {string} filename
 * @param  {string} width
 *
 * @return {Promise}
 */
function writeMediaQueriesFile(instance) {
    let path = getFilePath(instance.options.filename) + '/' + instance.options.outputFile;

    console.log(chalk.blue(`\n=== Writing ${path} ===`));

    let mediaQueriesFile = stripFile(instance, 'original');

    return new Promise((resolve, reject) => {
        fs.writeFile(path, mediaQueriesFile, 'utf-8', error => {
            if (error) {
                reject();
            }

            resolve();
        });
    });
}

/**
 * Stripper Class
 *
 * @param {Object} options
 */
function Stripper(options = {}) {
    this.options = assign({}, defaults, options);
}

/**
 * Launch the Promises for media queries strippers
 *
 * @param  {string} filename
 * @param  {string} width
 *
 * @return {Promise[]}
 */
Stripper.prototype.launch = function() {
    return Promise.all([
        writeMediaQueriesFile(this),
        writeStrippedFile(this)
    ]);
};

module.exports = Stripper;
