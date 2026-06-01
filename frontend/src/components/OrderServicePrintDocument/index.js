import React from "react";

/** Mesmo padrão visual do PDF de orçamento (BudgetPrintDocument). */
const PDF_BLACK = "#111111";
const PDF_TEXT = "#222222";
const PDF_MUTED = "#555555";
const PDF_BORDER = "#cccccc";
const PDF_RULE = "#000000";

const fmtMoney = (n) =>
	(Number(n) || 0).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
	});

/**
 * PDF da Ordem de Serviço — layout alinhado ao orçamento (html2canvas / html2pdf).
 * @param {object} companyBlock — payload.company
 * @param {object} clientBlock — payload.client
 * @param {string} sellerName
 * @param {string} notes
 * @param {Array} items — itens da OS (order.items)
 * @param {number} totals — total geral
 * @param {string} orderNumber — ex.: PED-2026-0001
 * @param {string} budgetNumber — referência ao orçamento
 * @param {string} [orderCreatedAt] — ISO ou Date da criação da OS
 */
const OrderServicePrintDocument = React.forwardRef(function OrderServicePrintDocument(
	{
		companyBlock,
		clientBlock,
		sellerName,
		notes,
		items,
		totals,
		orderNumber,
		budgetNumber,
		orderCreatedAt,
	},
	ref
) {
	const list = Array.isArray(items) ? items : [];
	const issued =
		orderCreatedAt != null
			? new Date(orderCreatedAt).toLocaleDateString("pt-BR", {
					day: "2-digit",
					month: "long",
					year: "numeric",
			  })
			: new Date().toLocaleDateString("pt-BR", {
					day: "2-digit",
					month: "long",
					year: "numeric",
			  });

	return (
		<div
			ref={ref}
			style={{
				fontFamily: '"Times New Roman", Times, Georgia, serif',
				color: PDF_TEXT,
				background: "#ffffff",
				padding: "24px 28px 32px",
				maxWidth: 720,
				margin: "0 auto",
				boxSizing: "border-box",
			}}
		>
			<div
				style={{
					borderTop: `3px double ${PDF_RULE}`,
					borderBottom: `1px solid ${PDF_BORDER}`,
					padding: "12px 0 14px",
					marginBottom: 20,
				}}
			>
				<table style={{ width: "100%", borderCollapse: "collapse" }}>
					<tbody>
						<tr>
							<td style={{ verticalAlign: "top", width: "58%" }}>
								{companyBlock?.logoUrl ? (
									<img
										src={companyBlock.logoUrl}
										alt=""
										crossOrigin="anonymous"
										style={{
											maxWidth: 150,
											maxHeight: 56,
											objectFit: "contain",
											marginBottom: 8,
											display: "block",
										}}
									/>
								) : null}
								<div
									style={{
										fontSize: 14,
										fontWeight: 700,
										color: PDF_BLACK,
										marginBottom: 4,
										textTransform: "uppercase",
										letterSpacing: "0.04em",
									}}
								>
									{companyBlock?.name || "—"}
								</div>
								<div style={{ fontSize: 10, color: PDF_MUTED, lineHeight: 1.5 }}>
									{companyBlock?.phone ? <div>{companyBlock.phone}</div> : null}
									{companyBlock?.email ? <div>{companyBlock.email}</div> : null}
									{companyBlock?.document ? <div>CNPJ {companyBlock.document}</div> : null}
								</div>
							</td>
							<td style={{ verticalAlign: "top", textAlign: "right" }}>
								<div
									style={{
										display: "inline-block",
										textAlign: "right",
										border: `1px solid ${PDF_BLACK}`,
										padding: "12px 16px",
										minWidth: 200,
									}}
								>
									<div
										style={{
											fontSize: 9,
											textTransform: "uppercase",
											letterSpacing: "0.15em",
											color: PDF_MUTED,
											marginBottom: 4,
										}}
									>
										Ordem de serviço
									</div>
									<div style={{ fontSize: 18, fontWeight: 700, color: PDF_BLACK }}>
										{orderNumber || "—"}
									</div>
									<div style={{ fontSize: 10, color: PDF_MUTED, marginTop: 8 }}>
										<span style={{ color: PDF_TEXT, fontWeight: 600 }}>Emitida em: </span>
										{issued}
									</div>
									{budgetNumber ? (
										<div style={{ fontSize: 10, color: PDF_MUTED, marginTop: 4 }}>
											<span style={{ color: PDF_TEXT, fontWeight: 600 }}>Ref. orçamento: </span>
											{budgetNumber}
										</div>
									) : null}
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div
				style={{
					border: `1px solid ${PDF_BORDER}`,
					padding: "14px 16px",
					marginBottom: 18,
				}}
			>
				<div
					style={{
						fontSize: 9,
						textTransform: "uppercase",
						letterSpacing: "0.12em",
						color: PDF_MUTED,
						fontWeight: 600,
						marginBottom: 8,
						borderBottom: `1px solid ${PDF_BORDER}`,
						paddingBottom: 6,
					}}
				>
					Cliente
				</div>
				<div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: PDF_BLACK }}>
					{clientBlock?.name || "—"}
				</div>
				<div style={{ fontSize: 10, color: PDF_MUTED, lineHeight: 1.55 }}>
					{clientBlock?.doc ? <div>CPF/CNPJ: {clientBlock.doc}</div> : null}
					{clientBlock?.phone ? <div>Tel.: {clientBlock.phone}</div> : null}
					{clientBlock?.email ? <div>E-mail: {clientBlock.email}</div> : null}
					{clientBlock?.address || clientBlock?.city || clientBlock?.state || clientBlock?.zip ? (
						<div style={{ marginTop: 4 }}>
							{[clientBlock.address, [clientBlock.city, clientBlock.state].filter(Boolean).join("/"), clientBlock.zip ? `CEP ${clientBlock.zip}` : ""]
								.filter(Boolean)
								.join(" · ")}
						</div>
					) : null}
					{sellerName ? (
						<div style={{ marginTop: 6, color: PDF_TEXT }}>
							Representante: {sellerName}
						</div>
					) : null}
				</div>
			</div>

			<div
				style={{
					fontSize: 9,
					textTransform: "uppercase",
					letterSpacing: "0.12em",
					color: PDF_MUTED,
					fontWeight: 600,
					marginBottom: 6,
				}}
			>
				Serviços / produtos a executar
			</div>
			<table
				style={{
					width: "100%",
					borderCollapse: "collapse",
					fontSize: 10,
					border: `1px solid ${PDF_BLACK}`,
				}}
			>
				<thead>
					<tr>
						<th
							style={{
								padding: "8px 6px",
								textAlign: "center",
								width: 40,
								borderBottom: `2px solid ${PDF_BLACK}`,
								borderRight: `1px solid ${PDF_BORDER}`,
								fontWeight: 700,
							}}
						>
							Item
						</th>
						<th
							style={{
								padding: "8px 8px",
								textAlign: "left",
								borderBottom: `2px solid ${PDF_BLACK}`,
								borderRight: `1px solid ${PDF_BORDER}`,
								fontWeight: 700,
							}}
						>
							Descrição
						</th>
						<th
							style={{
								padding: "8px 6px",
								textAlign: "right",
								width: 48,
								borderBottom: `2px solid ${PDF_BLACK}`,
								borderRight: `1px solid ${PDF_BORDER}`,
								fontWeight: 700,
							}}
						>
							Qtd.
						</th>
						<th
							style={{
								padding: "8px 6px",
								textAlign: "right",
								width: 80,
								borderBottom: `2px solid ${PDF_BLACK}`,
								borderRight: `1px solid ${PDF_BORDER}`,
								fontWeight: 700,
							}}
						>
							V. unit.
						</th>
						<th
							style={{
								padding: "8px 6px",
								textAlign: "right",
								width: 84,
								borderBottom: `2px solid ${PDF_BLACK}`,
								fontWeight: 700,
							}}
						>
							Total
						</th>
					</tr>
				</thead>
				<tbody>
					{list.map((it, i) => {
						const lineTotal =
							it.total != null && it.total !== ""
								? Number(it.total)
								: Number(it.qty || 0) * Number(it.unitPrice || 0);
						return (
							<tr key={i}>
								<td
									style={{
										padding: "7px 6px",
										textAlign: "center",
										borderBottom: `1px solid ${PDF_BORDER}`,
										borderRight: `1px solid ${PDF_BORDER}`,
									}}
								>
									{it.code || i + 1}
								</td>
								<td
									style={{
										padding: "7px 8px",
										borderBottom: `1px solid ${PDF_BORDER}`,
										borderRight: `1px solid ${PDF_BORDER}`,
									}}
								>
									{it.description}
								</td>
								<td
									style={{
										padding: "7px 6px",
										textAlign: "right",
										borderBottom: `1px solid ${PDF_BORDER}`,
										borderRight: `1px solid ${PDF_BORDER}`,
									}}
								>
									{it.qty}
								</td>
								<td
									style={{
										padding: "7px 6px",
										textAlign: "right",
										borderBottom: `1px solid ${PDF_BORDER}`,
										borderRight: `1px solid ${PDF_BORDER}`,
									}}
								>
									{fmtMoney(it.unitPrice)}
								</td>
								<td
									style={{
										padding: "7px 6px",
										textAlign: "right",
										fontWeight: 600,
										borderBottom: `1px solid ${PDF_BORDER}`,
									}}
								>
									{fmtMoney(lineTotal)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>

			<table style={{ width: "100%", marginTop: 14, borderCollapse: "collapse" }}>
				<tbody>
					<tr>
						<td />
						<td style={{ width: 260, verticalAlign: "top" }}>
							<div
								style={{
									border: `2px solid ${PDF_BLACK}`,
									padding: "12px 14px",
									textAlign: "right",
								}}
							>
								<div style={{ fontSize: 9, color: PDF_MUTED, marginBottom: 2 }}>TOTAL DA ORDEM</div>
								<div style={{ fontSize: 18, fontWeight: 700, color: PDF_BLACK }}>{fmtMoney(totals)}</div>
							</div>
						</td>
					</tr>
				</tbody>
			</table>

			{notes ? (
				<div
					style={{
						marginTop: 20,
						paddingTop: 12,
						borderTop: `1px solid ${PDF_BORDER}`,
						fontSize: 10,
						color: PDF_MUTED,
						lineHeight: 1.5,
					}}
				>
					<span style={{ color: PDF_BLACK, fontWeight: 600 }}>Observações. </span>
					{notes}
				</div>
			) : null}

			<div
				style={{
					marginTop: 24,
					paddingTop: 12,
					borderTop: `1px solid ${PDF_BORDER}`,
					fontSize: 8,
					color: PDF_MUTED,
					textAlign: "center",
					lineHeight: 1.45,
				}}
			>
				Documento de ordem de serviço para execução dos itens discriminados.
				<br />
				Em caso de dúvidas, utilize os dados de contato do emitente no cabeçalho.
			</div>
		</div>
	);
});

export default OrderServicePrintDocument;
