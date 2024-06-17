import { cp, rm, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { Packager } from "@webos-tools/cli";

const { values, positionals } = parseArgs({
  args: process.argv,
  options: {
    srcPath: {
      type: "string",
      default: "dist/better-xcloud.user.js",
      short: "s",
    },
    outDir: {
      type: "string",
      default: "dist",
      short: "o",
    },
    templatePath: {
      type: "string",
      default: "src/targets/webos/template",
      short: "t",
    },
  },
  strict: true,
  allowPositionals: true,
});

if (values.srcPath == null) {
  console.log("Missing --srcPath param");
  process.exit(-1);
}

if (values.outDir == null) {
  console.log("Missing --outDir param");
  process.exit(-1);
}

if (values.templatePath == null) {
  console.log("Missing --templatePath param");
  process.exit(-1);
}

console.log(`Bundling: ${values.srcPath}`);

// find version by looking for `// @version [version]` in source file
let src = await readFile(values.srcPath, "utf-8");
const version = src.match(/\/\/ @version\s+(\S+)/)?.[1];

if (version == null) {
  console.log("Failed to find version in source file");
  process.exit(-1);
}

console.log(`Version: ${version}`);

// write `Additional Code` to `src`
const additionalCode = await readFile(
  "src/targets/webos/additional-code.js",
  "utf-8"
);
src = src.replace("/* ADDITIONAL CODE */", additionalCode);

console.log(`Injected webOS-specific code`);

// copy template to output directory
const templateOutDir = join(values.outDir, "webos");
await rm(templateOutDir, { recursive: true, force: true });
await cp(values.templatePath, templateOutDir, { recursive: true });
await writeFile(join(templateOutDir, "webOSUserScripts", "userScript.js"), src);

// stamp version number in `appinfo.json`
const appinfoPath = join(templateOutDir, "appinfo.json");
const appinfoObj = JSON.parse(await readFile(appinfoPath, "utf-8"));
appinfoObj.version = version;
await writeFile(appinfoPath, JSON.stringify(appinfoObj, null, 2));

console.log(`Created webOS source package`);

// generate .ipk file from template, injecting the new version number
console.log(`Generating .ipk file`);

await Packager.generatePackage(
  [templateOutDir],
  values.outDir,
  {
    pkgversion: version,
    minify: false,
    // level: "silly",
  },
  (value) => {
    console.log(`---- [bundle] *** ${value}`);
  },
  (err, value) => {
    if (err) {
      // handle err from getErrMsg()
      if (Array.isArray(err) && err.length > 0) {
        for (const index in err) {
          console.error(err[index].heading, err[index].message);
        }
        console.log(err[0].stack);
      } else {
        // handle general err (string & object)
        console.error(err.toString());
        console.log(err.stack);
      }
      process.exit(-1);
    } else {
      console.log(`---- [bundle] *** ${value.msg}`);
      process.exit(0);

      // TODO: figure out where the webOS tools are preventing the process from exiting. some async operations are still running.
    }
  }
);
