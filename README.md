# Strip Media Queries

> Node module to strip media queries from a CSS file and create a file with them.

## Usage

Install the module globally via:

```shell
npm install strip-media-queries -g
```

Run it from your project folder. e.g.

```shell
strip-media-queries --filename=demo/style.css --width=400
```

## Options

The options for the module are the following:

- `files`: The name of the file that contains the media queries.
- `width`: The width of the media queries to strip out. `Default: '1200'`
- `override`: Configure if override the original file or create a new one. `Default: false`
- `stripperSuffix`: The suffix to add to the new stripped file. `Default: '.stripped.css'`
