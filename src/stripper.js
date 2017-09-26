'use strict';

const fs = require('mz/fs');
const css = require('css');
const assign = require('object-assign-deep');
const chalk = require('chalk');
const glob = require('glob');
const filters = {
    strip: filterMediaQueries,
    original: filterNonMediaQueries,
    extract: filterMediaQueriesToExtract,
    stripExtract: filterMediaQueriesNotToExtract
};
const defaults = {
    widths: [],
    extract: [],
    overrideOriginal: false,
    strippedSuffix: 'stripped'
};

/**
 * Filter a css rule based on media width
 *
 * @param  {Array} widths
 * @param  {Object} rule
 *
 * @return {boolean}
 */
function filterMediaQueriesToExtract(extract, rule) {
    return rule.type === 'media' && extract.some(function (extractWidth) {
        return rule.media.match(`${extractWidth}px`);
    });
}

/**
 * Filter a css rule based on media width
 *
 * @param  {Array} widths
 * @param  {Object} rule
 *
 * @return {boolean}
 */
function filterMediaQueriesNotToExtract(extract, rule) {
    return rule.type !== 'media' || rule.type === 'media' && extract.every(function (extractWidth) {
        return !rule.media.match(`${extractWidth}px`);
    });
}

/**
 * Filter a css rule based on media width
 *
 * @param  {Array} widths
 * @param  {Object} rule
 *
 * @return {boolean}
 */
function filterMediaQueries(widths, rule) {
    return rule.type !== 'media' || rule.type === 'media' && widths.every(function (width) {
        return !rule.media.match(`${width}px`);
    });
}

/**
 * Filter a css rule based on media width
 *
 * @param  {Array} widths
 * @param  {Object} rule
 *
 * @return {boolean}
 */
function filterNonMediaQueries(widths, rule) {
    return rule.type === 'media' && widths.some(function (width) {
        return rule.media.match(`${width}px`);
    });
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

    return fs.readFile(filename, 'utf-8')
        .then(source => {
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
        let strippedContent = cssFile.stylesheet.rules.filter(filters[filter].bind(null, instance.options.widths));
        let extractedContent = [];

        if (filter === 'strip' && instance.options.extract.length) {
            extractedContent = strippedContent
                .filter(filters['extract'].bind(null, instance.options.extract))
                .map(({ rules }) => rules);

            strippedContent = strippedContent
                .filter(filters['stripExtract'].bind(null, instance.options.extract));
        }

        console.log(`${chalk.blue(filename + ':')} ${strippedContent.length} rules found for the ${filter} function\n`);

        cssFile = Object.assign({}, cssFile, {
            stylesheet: Object.assign({}, cssFile.stylesheet, {
                rules: strippedContent.concat(...extractedContent)
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
                .then(notMediaQueriesFile =>
                    fs.writeFile(path, notMediaQueriesFile)
                )
                .catch(error => {
                    console.error(path + ', here');
                    throw error;
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
    return Promise.all(
        instance.files
        .map(filename => {
            console.log(chalk.blue(`Writing ${path} from ${filename}\n`));

            return stripFile(instance, 'original', filename);
        })
    ).then(strippedFiles =>
        fs.writeFile(path, strippedFiles.join('\n'), 'utf-8')
    );
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
    let ignore = instance.options.ignore ? glob.sync(instance.options.ignore) : instance.options.files ? instance.options.files.ignore : [];

    if (!files.length) {
        throw chalk.red('No files found.');
    }

    return files
            .filter(filterFileName.bind(null, instance))
            .filter(filename => {
                return ignore.indexOf(filename) === -1;
            });
}

/**
 * Converts an array like string to an actual Array,
 * converting also underscores to spaces
 *
 * @param  {string} arrayLike The string of items
 * e.g.
 * "100,400,1200"
 *
 * @return {Array}  The items wrapped in an Array
 */
function convertStringToArray(arrayLike) {
    if (!arrayLike) {
        return [];
    }

    if (typeof arrayLike === 'object') {
        return Object.keys(arrayLike).map(function (itemKey) {
            return arrayLike[itemKey];
        });
    }

    if (typeof arrayLike === 'number') {
        return [''+arrayLike];
    }

    return arrayLike
        .replace(/\s/g, '')
        .split(',');
}

/**
 * Stripper Class
 *
 * @param {Object} options
 */
function Stripper(options = {}) {
    // width as option has to be deprecated.
    options.widths = options.widths || options.width;

    delete options.width;

    if (!options.widths) {
        throw chalk.red('You have to specify a widths option');
    }

    if (!options.dest) {
        throw chalk.red('You have to specify a dest option');
    }

    this.options = assign({}, defaults, options);
    this.options.widths = convertStringToArray(this.options.widths);
    this.options.extract = convertStringToArray(this.options.extract);
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
