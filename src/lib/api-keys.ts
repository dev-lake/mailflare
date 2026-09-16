import { hashCredential, verifyCredential } from "@/lib/auth/credential-hash";
import { newId } from "@/lib/ids";

const KEY_PREFIX = "ep_";
const PURPOSE = "mailflare-api-key-v1";

export function generateApiKey(): { fullKey: string; prefix: string; hash: string } {
	const secret = newId();
	const fullKey = `${KEY_PREFIX}${secret}`;
	const prefix = fullKey.slice(0, 12);
	const hash = hashCredential(fullKey, PURPOSE);
	return { fullKey, prefix, hash };
}

export function verifyApiKey(fullKey: string, hash: string): boolean {
	return verifyCredential(fullKey, hash, PURPOSE);
}

export function parseScopes(scopesJson: string): string[] {
	try {
		const parsed = JSON.parse(scopesJson) as unknown;
		return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
	} catch {
		return [];
	}
}

export function scopesToJson(scopes: string[]): string {
	return JSON.stringify(scopes);
}
