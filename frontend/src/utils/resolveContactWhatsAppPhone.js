import formatSerializedId from "./formatSerializedId";

const onlyDigits = (v) => String(v || "").replace(/\D/g, "");

/** BR: celular com 9 na frente (11 dígitos locais ou 55+DDD+9+8). */
function looksLikeBrazilMobile(d, excludeDigits) {
	if (!d || d.length < 10) return false;
	if (excludeDigits && d === excludeDigits) return false;
	if (/^55[1-9]{2}9[0-9]{8}$/.test(d)) return true;
	if (/^[1-9]{2}9[0-9]{8}$/.test(d)) return true;
	return false;
}

function isProbablyLid(stored, remoteJid) {
	if (!stored) return false;
	if (/@lid$/i.test(remoteJid || "")) return true;
	const s = String(stored);
	if (s.length >= 14 && s.length <= 16 && /^1\d+$/.test(s)) return true;
	if (s.length === 15 && s.startsWith("1")) return true;
	return false;
}

/**
 * Resolve telefone para exibir/copiar quando o WhatsApp grava LID em `contact.number`.
 * Ordem: JID @s.whatsapp.net → extraInfo (nome + heurística BR) → número se não for LID.
 */
export function resolveContactWhatsAppPhone(contact) {
	if (!contact) {
		return { copyText: "", displayLine: "—", isInternalId: false };
	}

	const rj = contact.remoteJid || "";
	const jidPn = rj.match(/^(\d+)@s\.whatsapp\.net$/i);
	if (jidPn) {
		const n = jidPn[1];
		return {
			copyText: n,
			displayLine: formatSerializedId(n) || n,
			isInternalId: false,
		};
	}

	const stored = onlyDigits(contact.number);
	const lid = isProbablyLid(stored, rj);

	const scoreName = (name) => {
		const s = (name || "").toLowerCase().trim();
		if (s.includes("telefone 1") || s === "telefone1") return 1;
		if (s.includes("telefone 2")) return 2;
		if (/telefone|fone|celular|cel\b|whatsapp|phone|mobile/i.test(s)) return 3;
		if (/cpf|cnpj|documento/i.test(s)) return 50;
		return 20;
	};

	const pickFromExtra = () => {
		const extra = contact.extraInfo;
		if (!Array.isArray(extra) || extra.length === 0) return null;

		const rows = extra
			.map((e) => ({
				d: onlyDigits(e.value),
				sc: scoreName(e.name),
				raw: e,
			}))
			.filter((x) => x.d.length >= 10);

		rows.sort((a, b) => a.sc - b.sc);

		for (const x of rows) {
			if (x.sc >= 50) continue;
			if (looksLikeBrazilMobile(x.d, stored)) return x.d;
		}
		for (const x of rows) {
			if (x.sc >= 50) continue;
			if (x.d.length >= 10 && x.d.length <= 13 && x.d !== stored) return x.d;
		}
		return null;
	};

	const fromExtra = pickFromExtra();

	if (lid && fromExtra) {
		return {
			copyText: fromExtra,
			displayLine: formatSerializedId(fromExtra) || fromExtra,
			isInternalId: false,
		};
	}

	if (stored && !lid) {
		return {
			copyText: stored,
			displayLine: formatSerializedId(contact.number) || stored,
			isInternalId: false,
		};
	}

	if (fromExtra) {
		return {
			copyText: fromExtra,
			displayLine: formatSerializedId(fromExtra) || fromExtra,
			isInternalId: false,
		};
	}

	if (lid && stored) {
		return {
			copyText: "",
			displayLine:
				"Número não disponível (WhatsApp usa ID interno). Cadastre o telefone em TELEFONE 1 ou outro campo do contato.",
			isInternalId: true,
		};
	}

	return {
		copyText: stored,
		displayLine: stored ? formatSerializedId(contact.number) || stored : "—",
		isInternalId: false,
	};
}

/**
 * Critério alinhado a assertContactPhone no backend (SendBudgetPdfWhatsAppService):
 * telefone resolvido ou dígitos em `number`, ou qualquer remoteJid (incl. @lid, @g.us).
 */
export function contactHasWhatsAppDestination(c) {
	if (!c) return false;
	const r = resolveContactWhatsAppPhone(c);
	const resolvedDigits = String(r.copyText || "").replace(/\D/g, "");
	if (resolvedDigits.length >= 10) return true;
	const rawDigits = onlyDigits(c.number);
	if (rawDigits.length >= 10) return true;
	const rj = String(c.remoteJid || "");
	return rj.includes("@");
}

export default resolveContactWhatsAppPhone;
