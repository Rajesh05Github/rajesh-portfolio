/**
 * Object storage abstraction (docs/database-design.md §6, master prompt §56:
 * files live in object storage, never as bytea in Postgres). Only a local
 * filesystem implementation exists today (docs/deployment.md — local-first
 * for now); swapping to Azure Blob Storage for production (Phase 21) means
 * implementing this same interface once, not touching any calling code.
 */
export type StorageProvider = {
  /** `key` is a storage-relative path, e.g. "resumes/<uuid>.pdf" — never a full URL. */
  save(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
};
