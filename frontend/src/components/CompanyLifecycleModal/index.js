import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Typography,
} from "@material-ui/core";
import { makeStyles, alpha } from "@material-ui/core/styles";
import CloseIcon from "@material-ui/icons/Close";
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineItem,
  TimelineSeparator,
} from "@material-ui/lab";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const EVENT_LABELS = {
  cadastro_realizado: "Cadastro",
  primeiro_acesso: "Primeiro acesso",
  alteracao_plano: "Alteração de plano",
  pagamento_confirmado: "Pagamento confirmado",
  vencimento: "Vencimento",
  inadimplencia: "Inadimplência",
  bloqueio: "Bloqueio",
  desbloqueio: "Desbloqueio",
  cancelamento: "Cancelamento",
  reativacao: "Reativação",
  alteracao_status: "Alteração de status",
};

const FINANCIAL_LABELS = {
  em_dia: { label: "Em dia", color: "primary" },
  pendente: { label: "Pendências", color: "default" },
  inadimplente: { label: "Inadimplente", color: "secondary" },
};

const useStyles = makeStyles((theme) => ({
  titleRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingRight: theme.spacing(1),
  },
  content: {
    padding: theme.spacing(2, 3, 3),
    [theme.breakpoints.down("xs")]: {
      padding: theme.spacing(2),
    },
  },
  summaryCard: {
    padding: theme.spacing(2),
    borderRadius: 10,
    height: "100%",
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor:
      theme.palette.type === "dark"
        ? alpha(theme.palette.common.white, 0.03)
        : alpha(theme.palette.common.black, 0.02),
  },
  summaryLabel: {
    fontSize: "0.72rem",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: theme.palette.text.secondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontWeight: 600,
    fontSize: "0.95rem",
  },
  sectionTitle: {
    fontWeight: 600,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  timelineWrap: {
    marginTop: theme.spacing(1),
    paddingLeft: 0,
  },
  eventMeta: {
    fontSize: "0.8rem",
    color: theme.palette.text.secondary,
    marginTop: 4,
  },
  loadingBox: {
    display: "flex",
    justifyContent: "center",
    padding: theme.spacing(6),
  },
}));

function formatDateTime(value) {
  if (!value) return "—";
  const m = moment(value);
  return m.isValid() ? m.format("DD/MM/YYYY HH:mm") : "—";
}

function formatDate(value) {
  if (!value) return "—";
  const m = moment(value, ["YYYY-MM-DD", "DD/MM/YYYY", moment.ISO_8601], true);
  if (!m.isValid()) {
    const m2 = moment(value);
    return m2.isValid() ? m2.format("DD/MM/YYYY") : String(value);
  }
  return m.format("DD/MM/YYYY");
}

const CompanyLifecycleModal = ({ open, onClose, companyId, companyName }) => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data: res } = await api.get(`/companies/${companyId}/lifecycle`);
      setData(res);
    } catch (err) {
      toastError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (open && companyId) {
      load();
    } else if (!open) {
      setData(null);
    }
  }, [open, companyId, load]);

  const company = data?.company;
  const financial = data?.financial;
  const operational = data?.operational;
  const timeline = data?.timeline || [];

  const finChip = FINANCIAL_LABELS[financial?.situation] || FINANCIAL_LABELS.em_dia;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle disableTypography className={classes.titleRow}>
        <Box>
          <Typography variant="h6">
            Ciclo de vida — {company?.name || companyName || "Empresa"}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Histórico financeiro, operacional e linha do tempo de eventos
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Fechar">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers className={classes.content}>
        {loading && (
          <Box className={classes.loadingBox}>
            <CircularProgress />
          </Box>
        )}

        {!loading && data && (
          <>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper className={classes.summaryCard} elevation={0}>
                  <Typography className={classes.summaryLabel}>Tempo na plataforma</Typography>
                  <Typography className={classes.summaryValue}>
                    {company?.daysRegistered != null
                      ? `${company.daysRegistered} dia(s)`
                      : "—"}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Cadastro: {formatDateTime(company?.createdAt)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper className={classes.summaryCard} elevation={0}>
                  <Typography className={classes.summaryLabel}>Vencimento mensalidade</Typography>
                  <Typography className={classes.summaryValue}>
                    {formatDate(company?.dueDate)}
                  </Typography>
                  {company?.daysToDue != null && (
                    <Typography variant="caption" color="textSecondary">
                      {company.isOverdue
                        ? `${Math.abs(company.daysToDue)} dia(s) em atraso`
                        : `${company.daysToDue} dia(s) para vencer`}
                    </Typography>
                  )}
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper className={classes.summaryCard} elevation={0}>
                  <Typography className={classes.summaryLabel}>Situação financeira</Typography>
                  <Box mt={0.5}>
                    <Chip size="small" color={finChip.color} label={finChip.label} />
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 8 }}>
                    Pagamentos: {financial?.paidCount ?? 0} · Pendentes: {financial?.pendingCount ?? 0}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Total pago: R$ {Number(financial?.totalPaid || 0).toFixed(2)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper className={classes.summaryCard} elevation={0}>
                  <Typography className={classes.summaryLabel}>Situação operacional</Typography>
                  <Typography className={classes.summaryValue}>
                    {operational?.situation === "operacional" ? "Operacional" : "Inativa"}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 8 }}>
                    Usuários: {operational?.userCount ?? 0} · Conexões:{" "}
                    {operational?.whatsappConnections ?? 0}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Último acesso: {formatDateTime(operational?.lastLogin)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Grid container spacing={2} style={{ marginTop: 8 }}>
              <Grid item xs={12} md={6}>
                <Typography className={classes.sectionTitle}>Status e plano</Typography>
                <Typography variant="body2">
                  <strong>Status:</strong>{" "}
                  {company?.status !== false ? "Ativa" : "Inativa"}
                </Typography>
                <Typography variant="body2">
                  <strong>Plano:</strong> {company?.plan?.name || "—"}
                  {company?.plan?.amount != null
                    ? ` · R$ ${Number(company.plan.amount).toFixed(2)}`
                    : ""}
                </Typography>
                <Typography variant="body2">
                  <strong>E-mail:</strong> {company?.email || "—"}
                </Typography>
                <Typography variant="body2">
                  <strong>Documento:</strong> {company?.document || "—"}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography className={classes.sectionTitle}>Pagamentos recentes</Typography>
                {(financial?.recentInvoices || []).length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    Nenhuma fatura registrada.
                  </Typography>
                ) : (
                  (financial.recentInvoices || []).slice(0, 6).map((inv) => (
                    <Typography key={inv.id} variant="body2" style={{ marginBottom: 4 }}>
                      {inv.detail || `Fatura #${inv.id}`} — R${" "}
                      {Number(inv.value || 0).toFixed(2)} — {inv.status}
                      {inv.dueDate ? ` · venc. ${formatDate(inv.dueDate)}` : ""}
                    </Typography>
                  ))
                )}
              </Grid>
            </Grid>

            <Divider style={{ margin: "20px 0 12px" }} />

            <Typography className={classes.sectionTitle}>Linha do tempo de eventos</Typography>
            {timeline.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Nenhum evento registrado ainda.
              </Typography>
            ) : (
              <Timeline align="left" className={classes.timelineWrap}>
                {timeline.map((ev, idx) => (
                  <TimelineItem key={ev.id}>
                    <TimelineSeparator>
                      <TimelineDot color="primary" variant="outlined" />
                      {idx < timeline.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography variant="subtitle2">
                        {ev.title ||
                          EVENT_LABELS[ev.eventType] ||
                          ev.eventType ||
                          "Evento"}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {EVENT_LABELS[ev.eventType] || ev.eventType} ·{" "}
                        {formatDateTime(ev.createdAt)}
                      </Typography>
                      {ev.description && (
                        <Typography variant="body2" style={{ marginTop: 4 }}>
                          {ev.description}
                        </Typography>
                      )}
                      {(ev.previousStatus || ev.newStatus) && (
                        <Typography className={classes.eventMeta}>
                          {ev.previousStatus && (
                            <>
                              De: <strong>{ev.previousStatus}</strong>
                            </>
                          )}
                          {ev.previousStatus && ev.newStatus && " → "}
                          {ev.newStatus && (
                            <>
                              Para: <strong>{ev.newStatus}</strong>
                            </>
                          )}
                        </Typography>
                      )}
                      {ev.user?.name && (
                        <Typography className={classes.eventMeta}>
                          Por: {ev.user.name}
                          {ev.user.email ? ` (${ev.user.email})` : ""}
                        </Typography>
                      )}
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CompanyLifecycleModal;
