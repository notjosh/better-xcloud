import { Packager, type NextFunction } from "@webos-tools/cli";
import path from "node:path";

type BundleConfiguration = {
  target: string;
  outDir: string;
  outputScriptName: string;
  outputMetaName: string;
};

const finish: NextFunction = (err, value) => {
  console.info("finish()");
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
    console.log("finish()", "value:", value);
    if (value && value[value.length - 1] && value[value.length - 1].msg) {
      console.log(value[value.length - 1].msg);
    } else if (value && value.msg) {
      console.log(value.msg);
    }
  }
};

export const bundle = async ({ target, outDir }: BundleConfiguration) => {
  const startTime = performance.now();

  console.log(`---- [${target}:bundle] bundling .ipk`);

  const destination = path.join(outDir, "webos");

  await Packager.generatePackage(
    [],
    destination,
    {},
    (value: string) => {
      console.log(`---- [${target}:bundle] *** ${value}`);
    },
    finish
  );

  console.log(
    `---- [${target}:bundle] bundling .ipk done in ${
      performance.now() - startTime
    } ms`
  );
};
