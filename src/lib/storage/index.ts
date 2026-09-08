import "server-only";
import { LocalStorageProvider } from "./local";
import { AzureBlobStorageProvider } from "./azure-blob";
import type { StorageProvider } from "./provider";

// docs/decisions (deployment.md §1, §3): local disk in dev, Azure Blob
// Storage in production — a container's local filesystem is both
// unwritable by the non-root process user and ephemeral (wiped on every
// restart/redeploy) either way, so local disk was never viable there
// (confirmed live: avatar upload failed with EACCES on Azure until this
// switched). `STORAGE_DRIVER` unset/"local" keeps existing dev behavior.
export const storage: StorageProvider =
  process.env.STORAGE_DRIVER === "azure-blob"
    ? new AzureBlobStorageProvider()
    : new LocalStorageProvider();
