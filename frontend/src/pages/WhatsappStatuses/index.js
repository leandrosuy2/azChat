import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography,
  makeStyles,
  alpha,
} from "@material-ui/core";
import {
  Add,
  Cancel,
  CloudUpload,
  Delete,
  FileCopy,
  History,
  Image,
  PlayArrow,
  Refresh,
  Schedule,
  Send,
  TextFields,
  Videocam,
  WhatsApp,
} from "@material-ui/icons";
import { useLocation } from "react-router-dom";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { isSocketClientReady } from "../../utils/socketClient";

const statusLabels = {
  all: "Todos",
  draft: "Rascunho",
  scheduled: "Agendado",
  publishing: "Publicando",
  published: "Publicado",
  failed: "Falhou",
  canceled: "Cancelado",
};

const statusColors = {
  draft: "#64748b",
  scheduled: "#7c3aed",
  publishing: "#0ea5e9",
  published: "#16a34a",
  failed: "#dc2626",
  canceled: "#6b7280",
};

const initialForm = {
  whatsappId: "",
  contentType: "text",
  body: "",
  scheduledAt: "",
  publishMode: "now",
  file: null,
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    minHeight: 0,
    overflow: "auto",
    padding: theme.spacing(2),
    background: theme.palette.background.default,
    ...theme.scrollbarStyles,
  },
  toolbar: {
    display: "flex",
    gap: theme.spacing(1),
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: theme.spacing(2),
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
  },
  statCard: {
    padding: theme.spacing(1.5),
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
  },
  statLabel: {
    fontSize: 12,
    color: theme.palette.text.secondary,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 800,
    lineHeight: 1.2,
  },
  list: {
    display: "grid",
    gap: theme.spacing(1.25),
  },
  item: {
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(1.5),
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: theme.spacing(1.5),
    background: theme.palette.background.paper,
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr",
    },
  },
  itemMeta: {
    display: "flex",
    gap: theme.spacing(1),
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: theme.spacing(0.75),
  },
  actions: {
    display: "flex",
    gap: theme.spacing(0.5),
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  previewShell: {
    background: "#111827",
    color: "#fff",
    borderRadius: 18,
    minHeight: 420,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
  },
  previewHeader: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(1.5),
    background: "rgba(0,0,0,0.2)",
  },
  previewBody: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(2),
    textAlign: "center",
    background: "linear-gradient(160deg, #0f172a 0%, #166534 100%)",
  },
  previewText: {
    fontSize: 22,
    fontWeight: 700,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  previewMedia: {
    maxWidth: "100%",
    maxHeight: 310,
    borderRadius: 10,
    objectFit: "contain",
    background: "#000",
  },
  uploadBox: {
    border: `1px dashed ${alpha(theme.palette.primary.main, 0.5)}`,
    borderRadius: 8,
    padding: theme.spacing(1.5),
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    background: alpha(theme.palette.primary.main, 0.05),
  },
  empty: {
    padding: theme.spacing(4),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
}));

function getStatusLabel(status) {
  return statusLabels[status] || status;
}

function contentIcon(type) {
  if (type === "image") return <Image fontSize="small" />;
  if (type === "video") return <Videocam fontSize="small" />;
  return <TextFields fontSize="small" />;
}

function toLocalDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const WhatsappStatuses = () => {
  const classes = useStyles();
  const { user, socket } = useContext(AuthContext);
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({});
  const [whatsapps, setWhatsapps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [historyRecord, setHistoryRecord] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState({
    status: new URLSearchParams(window.location.search).get("status") || "all",
    whatsappId: "all",
    searchParam: "",
  });

  useEffect(() => {
    const status = new URLSearchParams(location.search).get("status") || "all";
    setFilters((prev) => ({ ...prev, status }));
  }, [location.search]);

  const previewUrl = useMemo(() => {
    if (form.file) return URL.createObjectURL(form.file);
    if (editing?.mediaPath) {
      return `${process.env.REACT_APP_BACKEND_URL}/public/company${user.companyId}/${editing.mediaPath}`;
    }
    return "";
  }, [form.file, editing, user.companyId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statusRes, statsRes, whatsRes] = await Promise.all([
        api.get("/whatsapp-statuses", { params: filters }),
        api.get("/whatsapp-statuses/stats"),
        api.get("/whatsapp", { params: { session: 0 } }),
      ]);
      setRecords(statusRes.data.records || []);
      setStats(statsRes.data || {});
      setWhatsapps((whatsRes.data || []).filter((w) => (w.channel || "whatsapp") === "whatsapp"));
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.whatsappId]);

  useEffect(() => {
    const timer = setTimeout(fetchAll, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.searchParam]);

  useEffect(() => {
    if (!user.companyId || !isSocketClientReady(socket)) return undefined;
    const event = `company-${user.companyId}-whatsapp-status`;
    const handler = (data) => {
      if (data.action === "delete") {
        setRecords((prev) => prev.filter((item) => item.id !== data.record.id));
      } else if (data.record?.id) {
        setRecords((prev) => {
          const idx = prev.findIndex((item) => item.id === data.record.id);
          if (idx === -1) return [data.record, ...prev];
          const next = [...prev];
          next[idx] = data.record;
          return next;
        });
      }
      api.get("/whatsapp-statuses/stats").then(({ data: s }) => setStats(s || {})).catch(() => {});
    };
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [socket, user.companyId]);

  useEffect(() => {
    return () => {
      if (previewUrl && form.file) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, form.file]);

  const openNew = () => {
    setEditing(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setForm({
      whatsappId: record.whatsappId || "",
      contentType: record.contentType || "text",
      body: record.body || "",
      scheduledAt: toLocalDateTime(record.scheduledAt),
      publishMode: record.status === "scheduled" ? "scheduled" : "now",
      file: null,
    });
    setModalOpen(true);
  };

  const buildFormData = (publishNow) => {
    const data = new FormData();
    data.append("whatsappId", form.whatsappId);
    data.append("contentType", form.contentType);
    data.append("body", form.body || "");
    data.append("publishNow", publishNow ? "true" : "false");
    if (!publishNow) data.append("scheduledAt", form.scheduledAt);
    if (form.file) data.append("file", form.file);
    return data;
  };

  const saveStatus = async () => {
    try {
      const publishNow = form.publishMode === "now";
      if (!form.whatsappId) {
        toast.warning("Selecione a conta do WhatsApp.");
        return;
      }
      if (!publishNow && !form.scheduledAt) {
        toast.warning("Informe data e horário para agendar.");
        return;
      }
      if (editing) {
        const data = buildFormData(false);
        data.append("status", form.publishMode === "scheduled" ? "scheduled" : "draft");
        await api.put(`/whatsapp-statuses/${editing.id}`, data);
        toast.success("Status atualizado.");
      } else {
        await api.post("/whatsapp-statuses", buildFormData(publishNow));
        toast.success(publishNow ? "Status enviado para publicação." : "Status agendado.");
      }
      setModalOpen(false);
      fetchAll();
    } catch (err) {
      toastError(err);
    }
  };

  const doAction = async (record, action) => {
    try {
      if (action === "delete") {
        await api.delete(`/whatsapp-statuses/${record.id}`);
        toast.success("Status excluído.");
      } else {
        await api.post(`/whatsapp-statuses/${record.id}/${action}`);
        toast.success("Ação realizada.");
      }
      fetchAll();
    } catch (err) {
      toastError(err);
    }
  };

  const statCards = [
    ["published", "Publicados", stats.published || 0],
    ["scheduled", "Agendados", stats.scheduled || 0],
    ["failed", "Falhas", stats.failed || 0],
    ["today", "Hoje", stats.today || 0],
    ["week", "Semana", stats.week || 0],
    ["month", "Mês", stats.month || 0],
  ];

  return (
    <MainContainer>
      <MainHeader>
        <Title>Status do WhatsApp</Title>
        <Button variant="contained" color="primary" startIcon={<Add />} onClick={openNew}>
          Novo Status
        </Button>
      </MainHeader>

      <Paper className={classes.mainPaper} variant="outlined">
        <div className={classes.statGrid}>
          {statCards.map(([key, label, value]) => (
            <Paper key={key} className={classes.statCard} variant="outlined">
              <Typography className={classes.statLabel}>{label}</Typography>
              <Typography className={classes.statValue}>{value}</Typography>
            </Paper>
          ))}
        </div>

        <div className={classes.toolbar}>
          <TextField
            size="small"
            variant="outlined"
            placeholder="Buscar texto ou mídia"
            value={filters.searchParam}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchParam: e.target.value }))}
          />
          <FormControl variant="outlined" size="small" style={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            >
              {Object.keys(statusLabels).map((key) => (
                <MenuItem key={key} value={key}>{statusLabels[key]}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl variant="outlined" size="small" style={{ minWidth: 190 }}>
            <InputLabel>Conta</InputLabel>
            <Select
              label="Conta"
              value={filters.whatsappId}
              onChange={(e) => setFilters((prev) => ({ ...prev, whatsappId: e.target.value }))}
            >
              <MenuItem value="all">Todas</MenuItem>
              {whatsapps.map((w) => (
                <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title="Atualizar">
            <IconButton onClick={fetchAll} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </div>

        <div className={classes.list}>
          {records.length === 0 ? (
            <Paper className={classes.empty} variant="outlined">
              Nenhuma publicação encontrada.
            </Paper>
          ) : records.map((record) => (
            <Paper key={record.id} className={classes.item} variant="outlined">
              <Box minWidth={0}>
                <Box display="flex" alignItems="center" gridGap={8}>
                  {contentIcon(record.contentType)}
                  <Typography variant="subtitle2" noWrap>
                    {record.body || record.mediaName || "Status sem texto"}
                  </Typography>
                </Box>
                <div className={classes.itemMeta}>
                  <Chip
                    size="small"
                    label={getStatusLabel(record.status)}
                    style={{ color: "#fff", backgroundColor: statusColors[record.status] || "#64748b" }}
                  />
                  <Chip size="small" icon={<WhatsApp />} label={record.whatsapp?.name || `WhatsApp #${record.whatsappId}`} />
                  {record.scheduledAt && <Chip size="small" icon={<Schedule />} label={new Date(record.scheduledAt).toLocaleString()} />}
                  {record.publishedAt && <Chip size="small" icon={<History />} label={new Date(record.publishedAt).toLocaleString()} />}
                  {record.failureReason && <Chip size="small" label={record.failureReason} />}
                </div>
              </Box>
              <div className={classes.actions}>
                {record.status !== "published" && record.status !== "publishing" && (
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => openEdit(record)}>
                      <TextFields fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {record.status !== "published" && (
                  <Tooltip title="Publicar agora">
                    <IconButton size="small" onClick={() => doAction(record, "publish")}>
                      <Send fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Duplicar">
                  <IconButton size="small" onClick={() => doAction(record, "duplicate")}>
                    <FileCopy fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Visualizar histórico">
                  <IconButton size="small" onClick={() => setHistoryRecord(record)}>
                    <History fontSize="small" />
                  </IconButton>
                </Tooltip>
                {record.status === "scheduled" && (
                  <Tooltip title="Cancelar agendamento">
                    <IconButton size="small" onClick={() => doAction(record, "cancel")}>
                      <Cancel fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Excluir">
                  <IconButton size="small" onClick={() => doAction(record, "delete")}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </div>
            </Paper>
          ))}
        </div>
      </Paper>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? "Editar Status" : "Novo Status"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl variant="outlined" fullWidth size="small">
                    <InputLabel>Conta/Instância do WhatsApp</InputLabel>
                    <Select
                      label="Conta/Instância do WhatsApp"
                      value={form.whatsappId}
                      onChange={(e) => setForm((prev) => ({ ...prev, whatsappId: e.target.value }))}
                    >
                      {whatsapps.map((w) => (
                        <MenuItem key={w.id} value={w.id}>
                          {w.name} {w.status ? `(${w.status})` : ""}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl variant="outlined" fullWidth size="small">
                    <InputLabel>Tipo de conteúdo</InputLabel>
                    <Select
                      label="Tipo de conteúdo"
                      value={form.contentType}
                      onChange={(e) => setForm((prev) => ({ ...prev, contentType: e.target.value, file: null }))}
                    >
                      <MenuItem value="text">Texto</MenuItem>
                      <MenuItem value="image">Imagem com legenda</MenuItem>
                      <MenuItem value="video">Vídeo com legenda</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {form.contentType !== "text" && (
                  <Grid item xs={12}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      accept={form.contentType === "image" ? "image/*" : "video/*"}
                      onChange={(e) => setForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                    />
                    <Box className={classes.uploadBox}>
                      <CloudUpload color="primary" />
                      <Box flex={1} minWidth={0}>
                        <Typography variant="body2" noWrap>
                          {form.file?.name || editing?.mediaName || "Selecione a mídia do status"}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {form.contentType === "image" ? "Imagem" : "Vídeo"} será publicado no status.
                        </Typography>
                      </Box>
                      <Button size="small" variant="outlined" onClick={() => fileInputRef.current?.click()}>
                        Escolher
                      </Button>
                    </Box>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={5}
                    variant="outlined"
                    label={form.contentType === "text" ? "Texto do status" : "Legenda"}
                    value={form.body}
                    onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl variant="outlined" fullWidth size="small">
                    <InputLabel>Ação</InputLabel>
                    <Select
                      label="Ação"
                      value={form.publishMode}
                      onChange={(e) => setForm((prev) => ({ ...prev, publishMode: e.target.value }))}
                    >
                      <MenuItem value="now">Publicar agora</MenuItem>
                      <MenuItem value="scheduled">Agendar publicação</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {form.publishMode === "scheduled" && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      variant="outlined"
                      type="datetime-local"
                      label="Data e horário de publicação"
                      InputLabelProps={{ shrink: true }}
                      value={form.scheduledAt}
                      onChange={(e) => setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                    />
                  </Grid>
                )}
              </Grid>
            </Grid>
            <Grid item xs={12} md={6}>
              <div className={classes.previewShell}>
                <div className={classes.previewHeader}>
                  <Avatar style={{ width: 32, height: 32 }}>
                    <WhatsApp fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2">Pré-visualização</Typography>
                    <Typography variant="caption">Status do WhatsApp</Typography>
                  </Box>
                </div>
                <div className={classes.previewBody}>
                  {form.contentType === "image" && previewUrl ? (
                    <Box>
                      <img className={classes.previewMedia} src={previewUrl} alt="Preview do status" />
                      {form.body && <Typography style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{form.body}</Typography>}
                    </Box>
                  ) : form.contentType === "video" && previewUrl ? (
                    <Box>
                      <video className={classes.previewMedia} src={previewUrl} controls />
                      {form.body && <Typography style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{form.body}</Typography>}
                    </Box>
                  ) : (
                    <Typography className={classes.previewText}>
                      {form.body || "Seu status aparecerá aqui"}
                    </Typography>
                  )}
                </div>
              </div>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button
            color="primary"
            variant="contained"
            startIcon={form.publishMode === "now" ? <PlayArrow /> : <Schedule />}
            onClick={saveStatus}
          >
            {form.publishMode === "now" ? "Publicar agora" : "Agendar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!historyRecord} onClose={() => setHistoryRecord(null)} fullWidth maxWidth="sm">
        <DialogTitle>Histórico da publicação</DialogTitle>
        <DialogContent dividers>
          {historyRecord && (
            <Box display="grid" gridGap={8}>
              <Typography variant="body2"><strong>Responsável:</strong> {historyRecord.user?.name || "Não informado"}</Typography>
              <Typography variant="body2"><strong>Criado em:</strong> {new Date(historyRecord.createdAt).toLocaleString()}</Typography>
              {historyRecord.scheduledAt && (
                <Typography variant="body2"><strong>Agendado para:</strong> {new Date(historyRecord.scheduledAt).toLocaleString()}</Typography>
              )}
              {historyRecord.publishedAt && (
                <Typography variant="body2"><strong>Publicado em:</strong> {new Date(historyRecord.publishedAt).toLocaleString()}</Typography>
              )}
              <Typography variant="body2"><strong>Conta:</strong> {historyRecord.whatsapp?.name || `WhatsApp #${historyRecord.whatsappId}`}</Typography>
              <Typography variant="body2"><strong>Status:</strong> {getStatusLabel(historyRecord.status)}</Typography>
              {historyRecord.failureReason && (
                <Typography variant="body2"><strong>Falha:</strong> {historyRecord.failureReason}</Typography>
              )}
              <Paper variant="outlined" style={{ padding: 12, background: "rgba(0,0,0,0.03)", overflow: "auto" }}>
                <Typography variant="caption" component="pre" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(historyRecord.audit || {}, null, 2)}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryRecord(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </MainContainer>
  );
};

export default WhatsappStatuses;
