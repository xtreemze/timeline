import { cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = path.join(root, "schemas");
const targetDirectory = path.join(root, "dist", "schemas");

await mkdir(targetDirectory, { recursive: true });
for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
  await cp(path.join(sourceDirectory, entry.name), path.join(targetDirectory, entry.name));
}
