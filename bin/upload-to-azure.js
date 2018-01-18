#!/usr/bin/env node

const { execSync } = require("child_process");
const tar = require("tar");
const globby = require("globby");
const fs = require("fs");
const path = require("path");
const { version } = require("../package.json");

const [major, minor] = version.split(".");
const blobName = `interactive-launchpad_${major}.${minor}.tar.gz`;

console.log(" → Compressing files to tarball");

(async () => {
  const cwd = path.resolve(__dirname, "..");
  const paths = await globby([`**/**`, `!bin/*`], {
    gitignore: true,
    cwd
  });

  if (!fs.existsSync(`${cwd}/build`)){
    fs.mkdirSync(`${cwd}/build`);
  }

  tar
    .c(
      {
        gzip: true,
        file: `${cwd}/build/${blobName}`,
        cwd
      },
      paths
    )
    .then(res => {
      console.log(" ✔ Files compressed");

      console.log(" → Upload to Azure");

      execSync(
        [
          "az storage blob upload",
          '--content-type "application/gzip"',
          "-c launchpad",
          `-f build/${blobName}`,
          `-n ${blobName}`
        ].join(" "),
        {
          cwd,
          env: process.env
        }
      );

      console.log(" ✔ Uploaded to Azure");
    })
    .catch(err => {
      console.error(err);
      return process.exit(1);
    });
})();
