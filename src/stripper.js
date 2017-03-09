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
 * Load and parse, or retrieve cached parsed CSS, for a given filename
 *
 * @param  {string} instance
 * @param  {string} filename
 *
 * @return {Promise} Resolves to parsed CSS
 */
function getParsedCSS(instance, filename) {
    if (instance._cssCache[filename]) {
        return Promise.resolve(instance._cssCache[filename]);
    }
    return new Promise((resolve, reject) => {
        fs.readFile(filename, 'utf-8', (error, data) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(data);
        });
    }).then(source => {
        instance._cssCache[filename] = css.parse(source);
        return instance._cssCache[filename];
    });
}

/**
 * Strip a file based on a width and using a certain filter function
 *
 * @param  {string} filename
 * @param  {string} width
 * @param  {string} filter
 *
 * @return {Promise<string>}
 */
function stripFile(instance, filter, filename) {
    return getParsedCSS(instance, filename).then(cssFile => {
        const strippedContent = cssFile.stylesheet.rules.filter(filters[filter].bind(null, instance.options.width));

        console.log(`${chalk.blue(filename + ':')} ${strippedContent.length} rules found for the ${filter} function\n`);

        cssFile = Object.assign({}, cssFile, {
            stylesheet: Object.assign({}, cssFile.stylesheet, {
                rules: strippedContent
            })
        });

        return css.stringify(cssFile);
    });
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

            console.log(chalk.blue(`Writing ${path} from ${filename}\n`));

            return stripFile(instance, 'strip', filename)
                .then(notMediaQueriesFile => new Promise((resolve, reject) => {
                    fs.writeFile(path, notMediaQueriesFile, 'utf-8', error => {
                        if (error) {
                            console.error(path + ', here');
                            reject(error);
                            return;
                        }

                        resolve();
                    })
                }))
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
    return Promise.all(
        instance.files
        .map(filename => {
            console.log(chalk.blue(`Writing ${path} from ${filename}\n`));

            return stripFile(instance, 'original', filename);
        })
    ).then(strippedFiles => new Promise((resolve, reject) => {
        fs.writeFile(path, strippedFiles.join('\n'), 'utf-8', error => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    }));
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
    this._cssCache = {};
    return writeMediaQueriesFile(this)
        .then(() => writeStrippedFile(this));
};

module.exports = Stripper;
