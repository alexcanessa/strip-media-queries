# Strip Media Queries

[![npm version](https://badge.fury.io/js/strip-media-queries.svg)](https://badge.fury.io/js/strip-media-queries)

> Node module to strip media queries from a CSS file and create a file with them.

## Usage

Install the module globally via:

```shell
npm install strip-media-queries -g
```

Run it from your project folder. e.g.

```shell
strip-media-queries --files=demo/**.css --width=400
```

## Options

The options for the module are the following:

- `src`: The name of the file that contains the media queries.
- `dest`: The name of the file that will contains all the media queries.
- `ignore`: The files to be ignored.
- `width`: The width of the media queries to strip out. `Default: '1200'`
- `override`: Configure if override the original file or create a new one. `Default: false`
- `stripperSuffix`: The suffix to add to the new stripped file. `Default: '.stripped.css'`
