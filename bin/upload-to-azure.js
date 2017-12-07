#!/usr/bin/env node

const webpack = require('webpack');
const { execSync } = require('child_process');
const tar = require('tar');
const glob = require('glob');
const fs = require('fs');
const wpconfig = require('../webpack.config');
const { version } = require('../package.json');

const [major, minor] = version.split('.');
const blobName = `interactive-launchpad_${major}.${minor}.tar.gz`;

console.log(' → Compiling library');
webpack(wpconfig, err => {
  if (err) {
    console.error(err);
    return process.exit(1);
  }

  console.log(' ✔ Compiled library');

  console.log(' → Compressing files to tarball');

  const ignore = fs.readFileSync('.gitignore', {encoding: 'utf8'})
  .split('\n')
  .filter(pattern => !!pattern && pattern[0] !== '#' && pattern[0] !== '!') // Removing Comments & Files to be negated in gitignore.
  .map(pattern => pattern + (pattern.split('/').pop().indexOf('.') < 0 ? '/**' : '')) // Add proper filtering for folders.
  ignore.push('bin/**'); // Let's exclude the goodies in bin as well.

  glob('**/**', {ignore: ignore}, (err, files) => {
    if (err) {
      console.error(err);
      return process.exit(1);
    }

    tar.c(
        {
          gzip: true,
          file: `build/${blobName}`
        },
        files,
        (err, res) => {
            if (err) {
              console.error(err);
              return process.exit(1);
            }

            console.log(' ✔ Files compressed');

            console.log(' → Upload to Azure');

            execSync([
            'az storage blob upload',
            '--content-type "application/gzip"',
            '-c controls',
            `-f ../build/${blobName}`,
            `-n ${blobName}`
            ].join(' '), {
            cwd: __dirname,
            env: process.env,
            });

            console.log(' ✔ Uploaded to Azure');
        }
      )
  });
});
