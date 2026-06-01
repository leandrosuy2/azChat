/** Remove tudo que não for dígito. */
export function digitsOnly(s) {
	return String(s || "").replace(/\D/g, "");
}

/**
 * Formata telefone para exibição (Brasil): opcional +55, DDD e 8 ou 9 dígitos.
 * O valor armazenado deve ser apenas dígitos (ex.: 5511999999999).
 */
export function formatPhoneBr(raw) {
	const d = digitsOnly(raw).slice(0, 13);
	if (!d) return "";

	let prefix = "";
	let rest = d;
	if (rest.startsWith("55") && rest.length > 2) {
		prefix = "+55 ";
		rest = rest.slice(2);
	}
	if (!rest) return prefix.trim();

	if (rest.length <= 2) {
		return `${prefix}(${rest}`;
	}
	const ddd = rest.slice(0, 2);
	const num = rest.slice(2);
	if (!num) return `${prefix}(${ddd})`;
	if (num.length <= 4) {
		return `${prefix}(${ddd}) ${num}`;
	}
	if (num.length <= 8) {
		return `${prefix}(${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
	}
	return `${prefix}(${ddd}) ${num.slice(0, 5)}-${num.slice(5, 9)}`;
}

/** CPF (até 11) ou CNPJ (até 14) com máscara conforme quantidade de dígitos. */
export function formatDocumentBr(raw) {
	const d = digitsOnly(raw).slice(0, 14);
	if (!d) return "";

	if (d.length <= 11) {
		const p1 = d.slice(0, 3);
		const p2 = d.slice(3, 6);
		const p3 = d.slice(6, 9);
		const p4 = d.slice(9, 11);
		let out = p1;
		if (p2) out += `.${p2}`;
		if (p3) out += `.${p3}`;
		if (p4) out += `-${p4}`;
		return out;
	}

	const p1 = d.slice(0, 2);
	const p2 = d.slice(2, 5);
	const p3 = d.slice(5, 8);
	const p4 = d.slice(8, 12);
	const p5 = d.slice(12, 14);
	let out = `${p1}.${p2}.${p3}`;
	if (d.length > 8) out += `/${p4}`;
	if (d.length > 12) out += `-${p5}`;
	return out;
}
