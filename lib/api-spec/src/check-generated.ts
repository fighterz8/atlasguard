import { execFileSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "..", "..");
const checkedOpenApiPath = resolve(packageRoot, "openapi.yaml");
const checkedClientSrc = resolve(
  repositoryRoot,
  "lib",
  "api-client-react",
  "src",
);
const checkedGeneratedClient = resolve(checkedClientSrc, "generated");

const listFiles = async (root: string, prefix = ""): Promise<string[]> => {
  const entries = await readdir(join(root, prefix), { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = join(prefix, entry.name);
      return entry.isDirectory()
        ? listFiles(root, relativePath)
        : [relativePath];
    }),
  );

  return files.flat().sort();
};

const compareFiles = async (
  checkedPath: string,
  generatedPath: string,
  label: string,
): Promise<string[]> => {
  const [checked, generated] = await Promise.all([
    readFile(checkedPath),
    readFile(generatedPath),
  ]);
  return checked.equals(generated) ? [] : [label];
};

const compareDirectories = async (
  checkedRoot: string,
  generatedRoot: string,
): Promise<string[]> => {
  const [checkedFiles, generatedFiles] = await Promise.all([
    listFiles(checkedRoot),
    listFiles(generatedRoot),
  ]);
  const allFiles = [...new Set([...checkedFiles, ...generatedFiles])].sort();
  const mismatches: string[] = [];

  for (const relativePath of allFiles) {
    const checkedPath = join(checkedRoot, relativePath);
    const generatedPath = join(generatedRoot, relativePath);
    const [checkedExists, generatedExists] = await Promise.all([
      stat(checkedPath).then(
        () => true,
        () => false,
      ),
      stat(generatedPath).then(
        () => true,
        () => false,
      ),
    ]);

    if (!checkedExists || !generatedExists) {
      mismatches.push(`lib/api-client-react/src/generated/${relativePath}`);
      continue;
    }
    mismatches.push(
      ...(await compareFiles(
        checkedPath,
        generatedPath,
        `lib/api-client-react/src/generated/${relativePath}`,
      )),
    );
  }

  return mismatches;
};

const temporaryRoot = await mkdtemp(join(tmpdir(), "movewise-transport-"));
const generatedOpenApiPath = join(temporaryRoot, "openapi.yaml");
const generatedClientSrc = join(temporaryRoot, "client-src");

try {
  await mkdir(generatedClientSrc, { recursive: true });
  await copyFile(
    resolve(checkedClientSrc, "custom-fetch.ts"),
    resolve(generatedClientSrc, "custom-fetch.ts"),
  );

  execFileSync("pnpm", ["run", "generate:openapi"], {
    cwd: packageRoot,
    env: {
      ...process.env,
      MOVEWISE_OPENAPI_OUTPUT: generatedOpenApiPath,
    },
    stdio: "pipe",
  });
  execFileSync("pnpm", ["run", "generate:client"], {
    cwd: packageRoot,
    env: {
      ...process.env,
      MOVEWISE_CLIENT_WORKSPACE: generatedClientSrc,
      MOVEWISE_OPENAPI_INPUT: generatedOpenApiPath,
    },
    stdio: "pipe",
  });

  const mismatches = [
    ...(await compareFiles(
      checkedOpenApiPath,
      generatedOpenApiPath,
      "lib/api-spec/openapi.yaml",
    )),
    ...(await compareDirectories(
      checkedGeneratedClient,
      resolve(generatedClientSrc, "generated"),
    )),
  ];

  if (mismatches.length > 0) {
    console.error("Generated transport artifacts are stale:");
    mismatches.forEach((path) => console.error(`- ${path}`));
    console.error("Run: pnpm run transport:generate");
    process.exitCode = 1;
  } else {
    console.log("Generated transport artifacts are current.");
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
