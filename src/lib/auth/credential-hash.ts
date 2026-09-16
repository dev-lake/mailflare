import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/cloudflare";

const FORMAT = "hmac-sha256";

function getPepper(): string {
	const pepper = getEnv().PASSWORD_PEPPER?.trim();
	if (!pepper) throw new Error("PASSWORD_PEPPER is not configured");
	return pepper;
}

function digest(value: string, salt: string, purpose: string): Buffer {
	return createHmac("sha256", getPepper())
		.update(purpose, "utf8")
		.update("\0", "utf8")
		.update(salt, "utf8")
		.update("\0", "utf8")
		.update(value, "utf8")
		.digest();
}

/**
 * A low-CPU credential hash for Cloudflare Workers Free.
 *
 * The random per-value salt prevents identical credentials from sharing a
 * database value. The Worker-only pepper keeps a database-only leak from
 * being useful for offline guessing without spending bcrypt's CPU budget.
 */
export function hashCredential(value: string, purpose: string): string {
	const salt = randomBytes(16).toString("base64url");
	const hash = digest(value, salt, purpose).toString("base64url");
	return `${FORMAT}$${salt}$${hash}`;
}

export function verifyCredential(value: string, encoded: string, purpose: string): boolean {
	const [format, salt, expectedBase64, extra] = encoded.split("$");
	if (format !== FORMAT || !salt || !expectedBase64 || extra !== undefined) return false;

	try {
		const expected = Buffer.from(expectedBase64, "base64url");
		const actual = digest(value, salt, purpose);
		return expected.length === actual.length && timingSafeEqual(expected, actual);
	} catch {
		return false;
	}
}
