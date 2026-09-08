import "server-only";
import { BlobServiceClient } from "@azure/storage-blob";
import type { StorageProvider } from "./provider";

// Container is deliberately private (no public-access), the same as local
// disk storage was implicitly "private" — nothing serves a raw blob URL to
// visitors; `/api/avatar` and `/api/resume` always read through this
// provider with the account's own credentials and stream the bytes back
// themselves (docs/database-design.md §6's "files live in object storage,
// never as bytea" didn't change; only where "object storage" points).
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER || "portfolio-files";

function getContainerClient() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error(
      "AZURE_STORAGE_CONNECTION_STRING is not set — required when STORAGE_DRIVER=azure-blob.",
    );
  }
  const serviceClient =
    BlobServiceClient.fromConnectionString(connectionString);
  return serviceClient.getContainerClient(CONTAINER_NAME);
}

export class AzureBlobStorageProvider implements StorageProvider {
  async save(key: string, data: Buffer): Promise<void> {
    const blockBlobClient = getContainerClient().getBlockBlobClient(key);
    await blockBlobClient.uploadData(data);
  }

  async read(key: string): Promise<Buffer> {
    const blockBlobClient = getContainerClient().getBlockBlobClient(key);
    return blockBlobClient.downloadToBuffer();
  }

  async delete(key: string): Promise<void> {
    const blockBlobClient = getContainerClient().getBlockBlobClient(key);
    await blockBlobClient.deleteIfExists();
  }
}
