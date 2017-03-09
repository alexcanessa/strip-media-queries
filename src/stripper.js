'use strict';

const fs = require('fs');
const css = require('css');
const assign = require('deep-assign');
const chalk = require('chalk');
const glob = require('glob');
const filters = {
    strip: filterMediaQueries,
    original: filterNonMediaQueries
};
const defaults = {
    width: '1200',
    overrideOriginal: false,
    strippedSuffix: 'stripped'
};

/**
 * Filter a css rule based on media width
 *
 * @param  {string} width
 * @param  {Object} rule
 *
 * @return {boolean}
 */
function filterMediaQueries(width, rule) {
    return rule.type !== 'media' || rule.type === 'media' && !rule.media.match(`${width}px`);
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
 * Filter the filename based on options
 *
 * @param  {string} filename
 *
 * @return {Boolean}
 */
function filterFileName(instance, filename) {
    let regex = new RegExp(instance.options.strippedSuffix, 'g');

    return filename !== instance.options.dest && !filename.match(regex);
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
function stripFile(instance, filter, filename) {
    let cssFile = css.parse(fs.readFileSync(filename, 'utf-8'));
    let strippedContent = cssFile.stylesheet.rules.filter(filters[filter].bind(null, instance.options.width));

    console.log(`${strippedContent.length} rules found for the ${filter} function`);

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
    return Promise.all(
        instance.files
        .map(filename => {
            let path = filename;

            if (!instance.options.overrideOriginal) {
                let suffix = instance.options.strippedSuffix.replace(/\.css$|\./g, '');

                path = path.replace('.css', `.${suffix}.css`);
            }

            console.log(chalk.blue(`\n=== Writing ${path} from ${filename} ===`));

            let notMediaQueriesFile = stripFile(instance, 'strip', filename);

            return new Promise((resolve, reject) => {
                fs.writeFile(path, notMediaQueriesFile, 'utf-8', error => {
                    if (error) {
                        console.error(path + ', here');
                        reject(error);
                        return;
                    }

                    resolve();
                });
            });
        })
    );
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
    let path = instance.options.dest;
    let mediaQueriesFile = instance.files
        .map(filename => {
            console.log(chalk.blue(`\n=== Writing ${path} from ${filename} ===`));

            return stripFile(instance, 'original', filename);
        }).join('\n');

    return new Promise((resolve, reject) => {
        fs.writeFile(path, mediaQueriesFile, 'utf-8', error => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}

/**
 * Get the file list based on the given one
 *
 * @param  {Array|string} files
 *
 * @return {Array}
 */
function getFileList(instance) {
    let files = instance.options.src ? glob.sync(instance.options.src) : instance.options.files.src;
    let ignore = instance.options.ignore ? glob.sync(instance.options.ignore) : instance.options.files.ignore;

    return files
            .filter(filterFileName.bind(null, instance))
            .filter(filename => {
                return ignore.indexOf(filename) === -1;
            });
}

/**
 * Stripper Class
 *
 * @param {Object} options
 */
function Stripper(options = {}) {
    this.options = assign({}, defaults, options);
    this.files = getFileList(this);
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
    return writeMediaQueriesFile(this)
        .then(() => writeStrippedFile(this));
};

module.exports = Stripper;
