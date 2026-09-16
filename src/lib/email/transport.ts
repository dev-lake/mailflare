type OutboundMessage = EmailMessageBuilder;

function address(value: string | EmailAddress): string {
	if (typeof value === "string") return value;
	const escapedName = value.name.replace(/"/g, '\\"');
	return escapedName ? `"${escapedName}" <${value.email}>` : value.email;
}

function addresses(value: OutboundMessage["to"]): string[] | undefined {
	if (!value) return undefined;
	return (Array.isArray(value) ? value : [value]).map(address);
}

function base64(content: EmailAttachment["content"]): string {
	if (typeof content === "string") return Buffer.from(content, "utf8").toString("base64");
	if (content instanceof ArrayBuffer) return Buffer.from(new Uint8Array(content)).toString("base64");
	return Buffer.from(content.buffer, content.byteOffset, content.byteLength).toString("base64");
}

async function sendWithResend(
	apiKey: string,
	message: OutboundMessage,
	idempotencyKey?: string,
): Promise<EmailSendResult> {
	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
			...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
		},
		body: JSON.stringify({
			from: address(message.from),
			to: addresses(message.to),
			cc: addresses(message.cc),
			bcc: addresses(message.bcc),
			reply_to: message.replyTo ? address(message.replyTo) : undefined,
			subject: message.subject,
			text: message.text,
			html: message.html,
			headers: message.headers,
			attachments: message.attachments?.map((attachment) => ({
				filename: attachment.filename,
				content: base64(attachment.content),
				content_type: attachment.type,
				...(attachment.contentId ? { content_id: attachment.contentId } : {}),
			})),
		}),
	});

	const body = (await response.json().catch(() => null)) as
		| { id?: string; message?: string; name?: string }
		| null;
	if (!response.ok || !body?.id) {
		const detail = body?.message ?? body?.name ?? `HTTP ${response.status}`;
		throw new Error(`Resend failed: ${detail}`);
	}
	return { messageId: body.id };
}

/** Use Resend on Workers Free when configured, otherwise keep Mailflare's native transport. */
export async function sendOutboundEmail(
	env: CloudflareEnv,
	message: OutboundMessage,
	idempotencyKey?: string,
): Promise<EmailSendResult> {
	const resendApiKey = env.RESEND_API_KEY?.trim();
	if (resendApiKey) return sendWithResend(resendApiKey, message, idempotencyKey);
	return env.EMAIL.send(message);
}
