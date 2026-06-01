import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  FormControlLabel,
  Paper,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@material-ui/core";
import { getBackendUrl } from "../../config";

const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const PublicOrcamentoPage = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const [signerName, setSignerName] = useState("");
  const [accept, setAccept] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [doneMsg, setDoneMsg] = useState("");
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const hasDrawn = useRef(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState(""); // approve | reject

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const base = getBackendUrl();
      if (!base) {
        setErr("Configuração REACT_APP_BACKEND_URL ausente.");
        return;
      }
      const res = await fetch(`${base}/public/ticket-budgets/${token}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || "Orçamento não encontrado.");
        return;
      }
      const j = await res.json();
      setData(j);
    } catch (e) {
      setErr("Não foi possível carregar o orçamento.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const startDraw = (e) => {
    drawing.current = true;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const r = c.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - r.left;
    const y = (e.clientY ?? e.touches?.[0]?.clientY) - r.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const moveDraw = (e) => {
    if (!drawing.current) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const r = c.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - r.left;
    const y = (e.clientY ?? e.touches?.[0]?.clientY) - r.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.stroke();
    hasDrawn.current = true;
  };

  const endDraw = () => {
    drawing.current = false;
  };

  const clearCanvas = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    hasDrawn.current = false;
  };

  const postJson = async (path, body) => {
    const base = getBackendUrl();
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(j.error || j.message || "Erro na requisição");
    }
    return j;
  };

  const doApprove = async () => {
    setSubmitting(true);
    setDoneMsg("");
    try {
      let signatureImage = null;
      const c = canvasRef.current;
      if (c && hasDrawn.current) {
        signatureImage = c.toDataURL("image/png");
      }
      const j = await postJson(`/public/ticket-budgets/${token}/approve`, {
        signerName: signerName.trim(),
        signatureImage,
        acceptTerms: true,
      });
      setDoneMsg(`Orçamento aprovado! Pedido ${j.orderNumber || ""} gerado.`);
      setData((d) => ({ ...d, status: "approved" }));
    } catch (e) {
      setErr(e.message || "Falha ao aprovar.");
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  const doReject = async () => {
    setSubmitting(true);
    try {
      await postJson(`/public/ticket-budgets/${token}/reject`, {});
      setDoneMsg("Orçamento recusado.");
      setData((d) => ({ ...d, status: "rejected" }));
    } catch (e) {
      setErr(e.message || "Falha ao recusar.");
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (err && !data) {
    return (
      <Container maxWidth="sm" style={{ marginTop: 48 }}>
        <Paper style={{ padding: 24 }}>
          <Typography color="error">{err}</Typography>
        </Paper>
      </Container>
    );
  }

  const p = data?.payload || {};
  const items = p.items || [];
  const total = items.reduce(
    (acc, it) =>
      acc +
      (Number(it.total) ||
        Number(it.qty || 0) * Number(it.unitPrice || 0)),
    0
  );

  const status = data?.status;
  const readonly = status === "approved" || status === "rejected";

  return (
    <Container maxWidth="md" style={{ marginBottom: 48 }}>
      <Paper style={{ padding: 16, marginTop: 16 }}>
        <Typography variant="h5" gutterBottom>
          Orçamento {data?.budgetNumber}
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Status:{" "}
          {status === "pending"
            ? "Pendente"
            : status === "approved"
              ? "Aprovado"
              : status === "rejected"
                ? "Recusado"
                : status}
        </Typography>
        {doneMsg ? (
          <Typography color="primary" style={{ marginBottom: 8 }}>
            {doneMsg}
          </Typography>
        ) : null}
        {err ? (
          <Typography color="error" style={{ marginBottom: 8 }}>
            {err}
          </Typography>
        ) : null}

        <Box mt={2}>
          <Typography variant="subtitle1">{p.company?.name}</Typography>
          <Typography variant="body2">{p.company?.phone}</Typography>
          <Typography variant="body2">{p.company?.email}</Typography>
          <Typography variant="body2">CNPJ: {p.company?.document}</Typography>
        </Box>

        <Box mt={2}>
          <Typography variant="subtitle2">Cliente</Typography>
          <Typography variant="body2">{p.client?.name}</Typography>
          <Typography variant="body2">{p.client?.doc}</Typography>
          <Typography variant="body2">
            {p.client?.address} — {p.client?.city}/{p.client?.state} CEP {p.client?.zip}
          </Typography>
          <Typography variant="body2">Vendedor: {p.sellerName}</Typography>
        </Box>

        {data?.validUntil ? (
          <Typography variant="body2" style={{ marginTop: 8 }}>
            Válido até:{" "}
            {new Date(data.validUntil + "T12:00:00").toLocaleDateString("pt-BR")}
          </Typography>
        ) : null}

        <Box mt={2} style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Cód.", "Descrição", "Qtd", "Unit.", "Total"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: h === "Descrição" ? "left" : "right",
                      borderBottom: "1px solid #ddd",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td style={{ textAlign: "right" }}>{it.code || i + 1}</td>
                  <td>{it.description}</td>
                  <td style={{ textAlign: "right" }}>{it.qty}</td>
                  <td style={{ textAlign: "right" }}>{fmtMoney(it.unitPrice)}</td>
                  <td style={{ textAlign: "right" }}>{fmtMoney(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Typography align="right" style={{ marginTop: 8 }}>
            <strong>Total {fmtMoney(total)}</strong>
          </Typography>
        </Box>

        {p.notes ? (
          <Typography variant="body2" style={{ marginTop: 12 }}>
            {p.notes}
          </Typography>
        ) : null}

        {status === "approved" && data?.signatureSignerName ? (
          <Box mt={2}>
            <Typography variant="body2">
              Assinado por {data.signatureSignerName} em{" "}
              {data.signedAt
                ? new Date(data.signedAt).toLocaleString("pt-BR")
                : ""}
            </Typography>
            {data.signatureImage ? (
              <img
                src={data.signatureImage}
                alt="Assinatura"
                style={{ maxWidth: "100%", border: "1px solid #eee", marginTop: 8 }}
              />
            ) : null}
          </Box>
        ) : null}

        {!readonly ? (
          <Box mt={3}>
            <Typography variant="subtitle1">Assinar e aprovar</Typography>
            <TextField
              fullWidth
              label="Nome completo"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              margin="normal"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={accept}
                  onChange={(e) => setAccept(e.target.checked)}
                  color="primary"
                />
              }
              label="Li e aceito os valores e condições deste orçamento."
            />
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Assinatura (opcional)
            </Typography>
            <canvas
              ref={canvasRef}
              width={320}
              height={140}
              style={{ border: "1px solid #ccc", touchAction: "none", maxWidth: "100%" }}
              onMouseDown={startDraw}
              onMouseMove={moveDraw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={moveDraw}
              onTouchEnd={endDraw}
            />
            <Box mt={1}>
              <Button size="small" onClick={clearCanvas}>
                Limpar assinatura
              </Button>
            </Box>
            <Box mt={2} display="flex" flexWrap="wrap" style={{ gap: 8 }}>
              <Button
                variant="contained"
                color="primary"
                disabled={submitting || !signerName.trim() || !accept}
                onClick={() => {
                  setConfirmKind("approve");
                  setConfirmOpen(true);
                }}
              >
                Aprovar orçamento
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                disabled={submitting}
                onClick={() => {
                  setConfirmKind("reject");
                  setConfirmOpen(true);
                }}
              >
                Recusar
              </Button>
            </Box>
          </Box>
        ) : null}
      </Paper>

      <Dialog open={confirmOpen} onClose={() => !submitting && setConfirmOpen(false)}>
        <DialogTitle>
          {confirmKind === "approve" ? "Confirmar aprovação" : "Confirmar recusa"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmKind === "approve"
              ? "Deseja aprovar este orçamento? Um pedido será gerado automaticamente."
              : "Deseja recusar este orçamento?"}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            color="primary"
            variant="contained"
            disabled={submitting}
            onClick={() => (confirmKind === "approve" ? doApprove() : doReject())}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PublicOrcamentoPage;
