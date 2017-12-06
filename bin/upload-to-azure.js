#!/usr/bin/env node

const webpack = require('webpack');
const { execSync } = require('child_process');
const targz = require('targz');
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

  targz.compress({
      src: 'build',
      dest: `build/${blobName}`
  }, err => {
      if (err) {
          console.error(err);
          return process.exit(1);
      }

      console.log(' ✔ Files compressed')

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
  })
});
