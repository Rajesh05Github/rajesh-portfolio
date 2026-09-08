import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, normalize, resolve } from "node:path";
import type { StorageProvider } from "./provider";

// The env-configurable root is deliberately dynamic (docs/deployment.md —
// this stays local-disk in dev, becomes an Azure Blob container in prod), which is
// exactly what trips Next's static file-tracing heuristic (it can't prove
// which directory this resolves to, so it would otherwise trace/bundle the
// entire project as a safety net). turbopackIgnore opts out, per Next's own
// suggested fix — the actual path is still validated at request time by
// resolveKey() below.
const ROOT = resolve(
  /* turbopackIgnore: true */ process.env.STORAGE_LOCAL_DIR || "./storage",
);

/** Rejects any key that would escape ROOT via ".." — keys are generated server-side (uuid-based), never taken verbatim from user input, but this is a cheap, worthwhile guard. */
function resolveKey(key: string): string {
  const full = resolve(ROOT, normalize(key));
  if (!full.startsWith(ROOT)) {
    throw new Error("Invalid storage key.");
  }
  return full;
}

export class LocalStorageProvider implements StorageProvider {
  async save(key: string, data: Buffer): Promise<void> {
    const path = resolveKey(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  async read(key: string): Promise<Buffer> {
    return readFile(resolveKey(key));
  }

  async delete(key: string): Promise<void> {
    await rm(resolveKey(key), { force: true });
  }
}
