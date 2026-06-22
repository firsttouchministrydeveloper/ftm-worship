import { randomBytes } from "node:crypto";

export const INVITE_TOKEN_BYTES = 32;

export function generateInviteToken(): string {
  return randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
}
