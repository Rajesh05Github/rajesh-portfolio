import { hash, verify } from "@node-rs/argon2";

// argon2id, memory-hard — current best practice for password hashing
// (docs/decisions/0002-admin-auth.md). Parameters follow OWASP's baseline
// recommendation for argon2id (19 MiB memory, 2 iterations, 1 parallelism)
// scaled up slightly since this app hashes rarely (admin login only).
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export function verifyPassword(
  hashedPassword: string,
  password: string,
): Promise<boolean> {
  return verify(hashedPassword, password);
}
