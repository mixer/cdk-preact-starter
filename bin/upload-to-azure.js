#!/usr/bin/env node

const { execSync } = require('child_process');
const tar = require('tar');
const globby = require('globby');
const fs = require('fs');
const path = require('path');
const { version } = require('../package.json');

const [major, minor] = version.split('.');
const blobName = `interactive-launchpad_${major}.${minor}.tar.gz`;

console.log(' → Compressing files to tarball');

(async () => {
  const cwd = path.resolve(__dirname, '..')
  const paths = await globby([`**/**`, `!bin/*`], {
    gitignore: true,
    cwd
  });

  tar.c(
    {
      gzip: true,
      file: `${cwd}/build/${blobName}`,
      cwd
    },
    paths,
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
        `-f build/${blobName}`,
        `-n ${blobName}`
        ].join(' '), {
          cwd,
          env: process.env,
      });

        console.log(' ✔ Uploaded to Azure');
      }
    )
})();
