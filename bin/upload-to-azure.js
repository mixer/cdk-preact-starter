#!/usr/bin/env node

const { exec } = require('child_process');
const tar = require('tar');
const fs = require('fs');
const ncp = require('ncp');
const path = require('path');
const { version } = require('../package.json');

const cwd = process.cwd();

/**
 * Copies a file.
 */
function copyFile(src, dest, callback) {
  fs
    .createReadStream(src)
    .pipe(fs.createWriteStream(dest))
    .on('close', () => callback())
    .on('error', err => callback(err));
}

/**
 * Using the iterator that takes a `thing` and callback, returns a callback
 * that fires once all things are finished.
 */
function mapAll(things, iterator, callback) {
  if (things.length === 0) {
    return callback();
  }

  let todo = things.length;
  things.forEach(thing => {
    iterator(thing, err => {
      if (err) {
        todo = -1;
        callback(err);
      } else if (--todo === 0) {
        callback();
      }
    });
  });
}

/**
 * Creates a folder in the build directory full of the files to be packed.
 */
function createStagingFolder(folder, callback) {
  const fileBehaviors = [
    {
      paths: ['src', 'locales', 'readme.md', 'webpack.config.js', '.editorconfig', '.gitignore'],
      action: 'include',
    },
    {
      path: 'tsconfig.json',
      action: 'includeFrom',
      fromPath: `${__dirname}/rewrites/tsconfig.json`,
    },
    {
      path: 'package.json',
      action: 'rewrite',
      fn: data => {
        const contents = JSON.parse(data);
        ['tslint', 'tslint-microsoft-contrib', 'ncp'].forEach(dep => {
          delete contents.devDependencies[dep];
        });

        return JSON.stringify(contents, null, 2);
      },
    },
  ];

  const behavior = {
    include: (opts, callback) => {
      mapAll(
        opts.paths,
        (path, callback) => {
          if (fs.statSync(path).isDirectory()) {
            ncp(`${cwd}/${path}`, `${folder}/${path}`, callback);
          } else {
            copyFile(`${cwd}/${path}`, `${folder}/${path}`, callback);
          }
        },
        callback,
      );
    },
    includeFrom: (opts, callback) => {
      copyFile(opts.fromPath, `${folder}/${opts.path}`, callback);
    },
    rewrite: (opts, callback) => {
      fs.readFile(`${cwd}/${opts.path}`, 'utf-8', (err, contents) => {
        if (err) {
          return callback(err);
        }

        fs.writeFile(`${folder}/${opts.path}`, opts.fn(contents), callback);
      });
    },
  };

  mapAll(
    fileBehaviors,
    (item, callback) => {
      behavior[item.action](item, callback);
    },
    callback,
  );
}

/**
 * Compresses the requested folder into a tarball.
 */
function createTarball(folder, target, callback) {
  tar.create(
    {
      gzip: true,
      file: target,
      cwd: folder,
    },
    ['./'],
    callback,
  );
}

/**
 * Uploads a tarball to Azure.
 */
function uploadTarball(file, name, callback) {
  exec(
    [
      'az storage blob upload',
      '--content-type "application/gzip"',
      '-c launchpad',
      `-f ${file}`,
      `-n ${name}`,
    ].join(' '),
    {
      cwd,
      env: process.env,
    },
    callback,
  );
}

function stage(startMessage, stopMessage, callback) {
  const start = Date.now();
  console.log(` → ${startMessage}`);

  return err => {
    if (err) {
      console.error(err.stack || err);
      process.exit(1);
    }

    console.log(` ✔ ${stopMessage} (in ${Date.now() - start}ms)`);
    if (callback) {
      callback();
    }
  };
}

function run() {
  const [major, minor] = version.split('.');
  const blobName = `interactive-launchpad_${major}.${minor}.tar.gz`;
  const stagingFolder = `${__dirname}/../build/stage`;
  const tarball = `${__dirname}/../build/${blobName}`;

  if (!fs.existsSync(stagingFolder)) {
    fs.mkdirSync(stagingFolder);
  }

  createStagingFolder(
    stagingFolder,
    stage('Preparing files to compress', 'Files ready', () =>
      createTarball(
        stagingFolder,
        tarball,
        stage('Creating tarball', 'Finished creating tarball', () =>
          uploadTarball(tarball, blobName, stage('Uploading to Azure', 'Uploaded to Azure')),
        ),
      ),
    ),
  );
}

if (require.main === module) {
  run();
}
