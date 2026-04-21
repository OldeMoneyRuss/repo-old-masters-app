import { hash, verify } from "@node-rs/argon2";

const ARGON2ID_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, { ...ARGON2ID_OPTIONS, algorithm: 2 });
}

export async function verifyPassword(
  hashed: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(hashed, password, ARGON2ID_OPTIONS);
  } catch {
    return false;
  }
}
