import { createHash } from "node:crypto";

/** Never store a raw IP alongside user-submitted data — only its hash, for coarse abuse correlation (docs/database-design.md §5). */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}
