import { hashCredential, verifyCredential } from "@/lib/auth/credential-hash";

const PURPOSE = "mailflare-password-v1";

export function hashPassword(password: string): string {
	return hashCredential(password, PURPOSE);
}

export function verifyPassword(password: string, hash: string): boolean {
	return verifyCredential(password, hash, PURPOSE);
}
