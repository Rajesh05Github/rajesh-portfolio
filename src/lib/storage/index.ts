import "server-only";
import { LocalStorageProvider } from "./local";
import type { StorageProvider } from "./provider";

// Single concrete provider for now — see docs/decisions (deployment.md §1,
// §3): local disk in dev, Azure Blob Storage in production. When Blob
// support lands, this becomes `process.env.STORAGE_DRIVER === "azure-blob"
// ? new AzureBlobStorageProvider() : new LocalStorageProvider()`, and
// nothing else in the app changes.
export const storage: StorageProvider = new LocalStorageProvider();
