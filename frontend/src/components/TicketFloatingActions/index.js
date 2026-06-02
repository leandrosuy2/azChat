import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  makeStyles,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  FormControlLabel,
  Box,
  Chip,
  Divider,
  Paper,
  Tooltip,
  CircularProgress,
  Link,
} from "@material-ui/core";
import MoreVert from "@material-ui/icons/MoreVert";
import CalendarToday from "@material-ui/icons/CalendarToday";
import Note from "@material-ui/icons/Note";
import NotificationsActive from "@material-ui/icons/NotificationsActive";
import Add from "@material-ui/icons/Add";
import Close from "@material-ui/icons/Close";
import AttachFile from "@material-ui/icons/AttachFile";
import Edit from "@material-ui/icons/Edit";
import DeleteOutline from "@material-ui/icons/DeleteOutline";
import History from "@material-ui/icons/History";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

const SETORES = [
  { id: "consulta", name: "Consulta" },
  { id: "instalacao", name: "Instalação" },
  { id: "visita_tecnica", name: "Visita Técnica" },
];

const TIPOS_AGENDAMENTO = ["Consulta", "Instalação", "Visita Técnica", "Retorno", "Outro"];
const STATUS_ANOTACAO = ["aberta", "concluída", "pendente"];

const modalMaxWidth = 480;

const useStyles = makeStyles((theme) => ({
  /** Faixa acima do campo de mensagem — não sobrepõe o histórico do chat */
  toolbar: {
    flexShrink: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.5, 1),
    paddingRight: theme.spacing(1.5),
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor:
      theme.palette.type === "dark" ? theme.palette.grey[900] : theme.palette.grey[100],
    zIndex: 1,
  },
  iconBtn: {
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
    boxShadow: theme.shadows[2],
    padding: theme.spacing(0.75),
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
      boxShadow: theme.shadows[4],
    },
  },
  iconBtnMore: {
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
    boxShadow: theme.shadows[2],
    padding: theme.spacing(0.75),
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
      boxShadow: theme.shadows[4],
    },
  },
  modalContent: {
    padding: theme.spacing(2),
    overflowY: "auto",
    maxHeight: "70vh",
  },
  formField: {
    marginBottom: theme.spacing(2),
  },
  listEmpty: {
    padding: theme.spacing(3),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
  tabPanel: {
    paddingTop: theme.spacing(0),
  },
  reminderSummary: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
  reminderMetric: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 6,
    padding: theme.spacing(1),
    backgroundColor:
      theme.palette.type === "dark" ? theme.palette.grey[900] : theme.palette.grey[50],
  },
  reminderCard: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 6,
    padding: theme.spacing(1.25),
    marginBottom: theme.spacing(1),
    backgroundColor: theme.palette.background.paper,
  },
  reminderCardInactive: {
    opacity: 0.68,
  },
  reminderTitleRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing(1),
  },
  reminderActions: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(0.25),
    flexShrink: 0,
  },
  reminderMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.5),
    marginTop: theme.spacing(0.75),
  },
}));

const LS_PREFIX = "ticket_calendar_";

function loadFromStorage(ticketId, key) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + ticketId + "_" + key);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function saveToStorage(ticketId, key, data) {
  try {
    localStorage.setItem(LS_PREFIX + ticketId + "_" + key, JSON.stringify(data));
  } catch (e) {}
}

export default function TicketFloatingActions({ ticketId }) {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const [eventos, setEventos] = useState([]);
  const [anotacoes, setAnotacoes] = useState([]);
  const [loadingAnotacoes, setLoadingAnotacoes] = useState(false);
  const [savingAnotacao, setSavingAnotacao] = useState(false);
  const [editAnotacao, setEditAnotacao] = useState(null);
  const [lembretes, setLembretes] = useState([]);
  const [loadingLembretes, setLoadingLembretes] = useState(false);
  const [savingLembrete, setSavingLembrete] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoTitulo, setHistoricoTitulo] = useState("");
  const [historicoDisparos, setHistoricoDisparos] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [formEvento, setFormEvento] = useState({
    setor: "consulta",
    responsavel: "",
    tipo: "Consulta",
    data: "",
    hora: "",
    localizacao: "",
    descricao: "",
  });
  const [formAnotacao, setFormAnotacao] = useState({ texto: "", arquivo: null });
  const [showFormAnotacao, setShowFormAnotacao] = useState(false);
  const [anotacaoEventoId, setAnotacaoEventoId] = useState(null);
  const [formLembrete, setFormLembrete] = useState({
    nome: "",
    descricao: "",
    data: "",
    hora: "",
    addGoogle: false,
    destinoTipo: "pessoal",
    destinoId: "",
  });
  const [lembreteEventoId, setLembreteEventoId] = useState(null);

  useEffect(() => {
    if (!ticketId) return;
    const e = loadFromStorage(ticketId, "eventos");
    if (Array.isArray(e)) setEventos(e);
  }, [ticketId]);

  const fetchAnotacoes = useCallback(async () => {
    if (!ticketId) return;
    setLoadingAnotacoes(true);
    try {
      const { data } = await api.get(`/tickets/${ticketId}/anotacoes`);
      setAnotacoes(Array.isArray(data.anotacoes) ? data.anotacoes : []);
    } catch (err) {
      toastError(err);
      setAnotacoes([]);
    } finally {
      setLoadingAnotacoes(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (!modalOpen || !ticketId || activeTab !== 1) return;
    fetchAnotacoes();
  }, [modalOpen, activeTab, ticketId, fetchAnotacoes]);

  const fetchLembretes = useCallback(async () => {
    if (!ticketId) return;
    setLoadingLembretes(true);
    try {
      const { data } = await api.get(`/tickets/${ticketId}/lembretes`);
      setLembretes(Array.isArray(data.lembretes) ? data.lembretes : []);
    } catch (err) {
      toastError(err);
      setLembretes([]);
    } finally {
      setLoadingLembretes(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (!modalOpen || !ticketId || activeTab !== 2) return;
    fetchLembretes();
  }, [modalOpen, activeTab, ticketId, fetchLembretes]);

  useEffect(() => {
    if (!modalOpen || activeTab !== 2) return;
    let mounted = true;
    setLoadingUsers(true);
    api
      .get("/users/list")
      .then(({ data }) => {
        if (!mounted) return;
        setUsers(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (mounted) toastError(err);
      })
      .finally(() => {
        if (mounted) setLoadingUsers(false);
      });
    return () => {
      mounted = false;
    };
  }, [modalOpen, activeTab]);

  const openModal = (tab) => {
    setActiveTab(tab);
    setModalOpen(true);
    setExpanded(false);
  };

  const handleCriarEvento = () => {
    if (!formEvento.data || !formEvento.hora) return;
    const novo = {
      id: "ev_" + Date.now(),
      ticketId,
      setor: formEvento.setor,
      responsavel: formEvento.responsavel,
      tipo: formEvento.tipo,
      data: formEvento.data,
      hora: formEvento.hora,
      localizacao: formEvento.localizacao || "",
      descricao: formEvento.descricao || "",
      createdAt: new Date().toISOString(),
    };
    const next = [...eventos, novo];
    setEventos(next);
    saveToStorage(ticketId, "eventos", next);
    setFormEvento({ ...formEvento, data: "", hora: "", localizacao: "", descricao: "" });
  };

  const handleSalvarAnotacao = async () => {
    const textoTrim = (formAnotacao.texto || "").trim();
    const textoFinal =
      textoTrim ||
      (formAnotacao.arquivo ? `Anexo: ${formAnotacao.arquivo.name}` : "");
    if (!textoFinal) return;
    setSavingAnotacao(true);
    try {
      if (formAnotacao.arquivo) {
        const fd = new FormData();
        fd.append("texto", textoTrim || textoFinal);
        if (anotacaoEventoId != null) fd.append("eventoId", String(anotacaoEventoId));
        fd.append("status", "aberta");
        fd.append("file", formAnotacao.arquivo);
        await api.post(`/tickets/${ticketId}/anotacoes`, fd);
      } else {
        await api.post(`/tickets/${ticketId}/anotacoes`, {
          texto: textoFinal,
          eventoId: anotacaoEventoId,
          status: "aberta",
        });
      }
      setFormAnotacao({ texto: "", arquivo: null });
      setShowFormAnotacao(false);
      setAnotacaoEventoId(null);
      await fetchAnotacoes();
    } catch (err) {
      toastError(err);
    } finally {
      setSavingAnotacao(false);
    }
  };

  const handleSalvarEdicaoAnotacao = async () => {
    if (!editAnotacao?.id) return;
    setSavingAnotacao(true);
    try {
      await api.patch(`/tickets/${ticketId}/anotacoes/${editAnotacao.id}`, {
        texto: (editAnotacao.texto || "").trim(),
        status: editAnotacao.status || "aberta",
      });
      setEditAnotacao(null);
      await fetchAnotacoes();
    } catch (err) {
      toastError(err);
    } finally {
      setSavingAnotacao(false);
    }
  };

  const handleExcluirAnotacao = async (id) => {
    if (!id || !window.confirm("Excluir esta anotação? Esta ação não pode ser desfeita.")) return;
    setSavingAnotacao(true);
    try {
      await api.delete(`/tickets/${ticketId}/anotacoes/${id}`);
      if (editAnotacao?.id === id) setEditAnotacao(null);
      await fetchAnotacoes();
    } catch (err) {
      toastError(err);
    } finally {
      setSavingAnotacao(false);
    }
  };

  const handleCriarLembrete = async () => {
    if (!(formLembrete.nome || "").trim() || !formLembrete.data || !formLembrete.hora) return;
    const destinoTipo = formLembrete.destinoTipo || "pessoal";
    const destinoId =
      destinoTipo === "pessoal"
        ? user?.id
        : destinoTipo === "usuario"
          ? formLembrete.destinoId
          : null;
    if ((destinoTipo === "pessoal" || destinoTipo === "usuario") && !destinoId) return;
    setSavingLembrete(true);
    try {
      await api.post(`/tickets/${ticketId}/lembretes`, {
        eventoId: lembreteEventoId,
        nome: formLembrete.nome.trim(),
        descricao: formLembrete.descricao || null,
        mensagemTemplate: formLembrete.descricao || null,
        data: formLembrete.data,
        hora: formLembrete.hora,
        addGoogle: formLembrete.addGoogle,
        tipoGatilho: "agendado",
        ativo: true,
        destinoTipo: destinoTipo === "geral" ? "interno" : "usuario",
        destinoId,
      });
      setFormLembrete({
        nome: "",
        descricao: "",
        data: "",
        hora: "",
        addGoogle: false,
        destinoTipo: "pessoal",
        destinoId: "",
      });
      setLembreteEventoId(null);
      await fetchLembretes();
    } catch (err) {
      toastError(err);
    } finally {
      setSavingLembrete(false);
    }
  };

  const handleToggleLembrete = async (lm) => {
    if (!lm?.id) return;
    setSavingLembrete(true);
    try {
      await api.put(`/tickets/${ticketId}/lembretes/${lm.id}`, {
        ativo: lm.ativo === false,
      });
      await fetchLembretes();
    } catch (err) {
      toastError(err);
    } finally {
      setSavingLembrete(false);
    }
  };

  const handleExcluirLembrete = async (lm) => {
    if (!lm?.id || !window.confirm("Remover este lembrete?")) return;
    setSavingLembrete(true);
    try {
      await api.delete(`/tickets/${ticketId}/lembretes/${lm.id}`);
      await fetchLembretes();
    } catch (err) {
      toastError(err);
    } finally {
      setSavingLembrete(false);
    }
  };

  const handleAbrirHistoricoLembrete = async (lm) => {
    if (!lm?.id) return;
    setHistoricoTitulo(lm.nome || "Lembrete");
    setHistoricoOpen(true);
    setLoadingHistorico(true);
    try {
      const { data } = await api.get(`/tickets/${ticketId}/lembretes/${lm.id}/disparos`);
      setHistoricoDisparos(Array.isArray(data.disparos) ? data.disparos : []);
    } catch (err) {
      toastError(err);
      setHistoricoDisparos([]);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const lembretesAtivos = lembretes.filter((lm) => lm.ativo !== false).length;
  const lembretesInativos = lembretes.length - lembretesAtivos;
  const proximoLembrete = lembretes
    .filter((lm) => lm.ativo !== false && lm.data && lm.hora)
    .sort((a, b) => `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`))[0];

  const eventosPorSetor = (setorId) => eventos.filter((e) => e.setor === setorId);
  const canCreateLembrete =
    !savingLembrete &&
    formLembrete.nome.trim() &&
    formLembrete.data &&
    formLembrete.hora &&
    (formLembrete.destinoTipo !== "usuario" || formLembrete.destinoId);

  const lembreteDestinoLabel = (lm) => {
    const tipo = String(lm.destinoTipo || "interno").toLowerCase();
    if (tipo === "usuario" || tipo === "responsavel") {
      if (lm.destinoId && Number(lm.destinoId) === Number(user?.id)) return "Pessoal";
      const target = users.find((u) => Number(u.id) === Number(lm.destinoId));
      return target?.name ? `Usuário: ${target.name}` : "Usuário específico";
    }
    return "Geral";
  };

  if (!ticketId) return null;

  return (
    <>
      <div className={classes.toolbar}>
        {expanded && (
          <>
            <Tooltip title="Agendamento">
              <IconButton className={classes.iconBtn} onClick={() => openModal(0)} size="small">
                <CalendarToday fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Anotações">
              <IconButton className={classes.iconBtn} onClick={() => openModal(1)} size="small">
                <Note fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Lembretes">
              <IconButton className={classes.iconBtn} onClick={() => openModal(2)} size="small">
                <NotificationsActive fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
        <Tooltip title={expanded ? "Fechar atalhos" : "Agendamento, anotações e lembretes"}>
          <IconButton
            className={classes.iconBtnMore}
            onClick={() => setExpanded((e) => !e)}
            size="small"
            aria-expanded={expanded}
            aria-label="Abrir menu de agendamento e lembretes"
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ style: { maxWidth: modalMaxWidth } }}
      >
        <DialogTitle disableTypography style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6">
            {activeTab === 0 && "Agendamento"}
            {activeTab === 1 && "Anotações"}
            {activeTab === 2 && "Lembretes"}
          </Typography>
          <IconButton onClick={() => setModalOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent className={classes.modalContent}>
          {activeTab === 0 && (
            <div className={classes.tabPanel}>
              <Typography variant="subtitle2" color="textSecondary" style={{ marginBottom: 12 }}>
                Criar evento vinculado ao calendário do setor
              </Typography>
              <FormControl fullWidth className={classes.formField}>
                <InputLabel>Setor</InputLabel>
                <Select value={formEvento.setor} onChange={(e) => setFormEvento({ ...formEvento, setor: e.target.value })} label="Setor">
                  {SETORES.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField fullWidth label="Nome do responsável" value={formEvento.responsavel} onChange={(e) => setFormEvento({ ...formEvento, responsavel: e.target.value })} className={classes.formField} />
              <FormControl fullWidth className={classes.formField}>
                <InputLabel>Tipo de agendamento</InputLabel>
                <Select value={formEvento.tipo} onChange={(e) => setFormEvento({ ...formEvento, tipo: e.target.value })} label="Tipo">
                  {TIPOS_AGENDAMENTO.map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField fullWidth type="date" label="Data" value={formEvento.data} onChange={(e) => setFormEvento({ ...formEvento, data: e.target.value })} InputLabelProps={{ shrink: true }} className={classes.formField} />
              <TextField fullWidth type="time" label="Hora" value={formEvento.hora} onChange={(e) => setFormEvento({ ...formEvento, hora: e.target.value })} InputLabelProps={{ shrink: true }} className={classes.formField} />
              <TextField fullWidth label="Localização (opcional)" value={formEvento.localizacao} onChange={(e) => setFormEvento({ ...formEvento, localizacao: e.target.value })} className={classes.formField} />
              <TextField fullWidth multiline rows={2} label="Descrição (opcional)" value={formEvento.descricao} onChange={(e) => setFormEvento({ ...formEvento, descricao: e.target.value })} className={classes.formField} />
              <Button variant="contained" color="primary" fullWidth startIcon={<Add />} onClick={handleCriarEvento} disabled={!formEvento.data || !formEvento.hora}>
                Criar evento
              </Button>
              <Divider style={{ margin: "24px 0 16px" }} />
              <Typography variant="subtitle2" style={{ marginBottom: 8 }}>Eventos por setor</Typography>
              {SETORES.map((setor) => {
                const list = eventosPorSetor(setor.id);
                return (
                  <Box key={setor.id} style={{ marginBottom: 16 }}>
                    <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600 }}>{setor.name}</Typography>
                    {list.length === 0 ? (
                      <Typography variant="body2" color="textSecondary" className={classes.listEmpty}>Nenhum evento</Typography>
                    ) : (
                      <List dense>
                        {list.map((ev) => (
                          <ListItem key={ev.id}>
                            <ListItemText primary={`${ev.data} ${ev.hora} - ${ev.tipo}`} secondary={ev.responsavel ? `Responsável: ${ev.responsavel}` : ev.descricao} />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                );
              })}
            </div>
          )}

          {activeTab === 1 && (
            <div className={classes.tabPanel}>
              {!showFormAnotacao ? (
                <Button variant="outlined" fullWidth startIcon={<Add />} onClick={() => setShowFormAnotacao(true)} style={{ marginBottom: 16 }}>
                  Criar nova anotação
                </Button>
              ) : (
                <Paper variant="outlined" style={{ padding: 16, marginBottom: 16 }}>
                  <Typography variant="subtitle2" style={{ marginBottom: 8 }}>Nova anotação</Typography>
                  <TextField fullWidth multiline rows={3} label="Texto livre" value={formAnotacao.texto} onChange={(e) => setFormAnotacao({ ...formAnotacao, texto: e.target.value })} className={classes.formField} />
                  <input type="file" id="anotacao-file" style={{ display: "none" }} onChange={(e) => setFormAnotacao({ ...formAnotacao, arquivo: e.target.files?.[0] || null })} />
                  <label htmlFor="anotacao-file">
                    <Button component="span" size="small" startIcon={<AttachFile />} style={{ marginRight: 8 }}>Upload arquivo</Button>
                  </label>
                  {formAnotacao.arquivo && <Typography variant="caption" color="textSecondary">{formAnotacao.arquivo.name}</Typography>}
                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={handleSalvarAnotacao}
                      disabled={
                        savingAnotacao ||
                        (!(formAnotacao.texto || "").trim() && !formAnotacao.arquivo)
                      }
                    >
                      {savingAnotacao ? <CircularProgress size={18} color="inherit" /> : "Salvar"}
                    </Button>
                    <Button
                      size="small"
                      disabled={savingAnotacao}
                      onClick={() => {
                        setShowFormAnotacao(false);
                        setFormAnotacao({ texto: "", arquivo: null });
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </Paper>
              )}
              <Typography variant="subtitle2" style={{ marginBottom: 8 }}>Listagem de anotações</Typography>
              {loadingAnotacoes ? (
                <Box display="flex" justifyContent="center" py={2}>
                  <CircularProgress size={28} />
                </Box>
              ) : anotacoes.length === 0 ? (
                <Typography variant="body2" className={classes.listEmpty}>
                  Nenhuma anotação encontrada. Use &quot;Criar nova anotação&quot; acima para adicionar.
                </Typography>
              ) : (
                <List dense>
                  {anotacoes.map((an) => (
                    <ListItem key={an.id} alignItems="flex-start">
                      {editAnotacao?.id === an.id ? (
                        <Box width="100%" py={1}>
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Texto"
                            value={editAnotacao.texto}
                            onChange={(e) =>
                              setEditAnotacao((prev) => ({ ...prev, texto: e.target.value }))
                            }
                            className={classes.formField}
                            variant="outlined"
                            margin="dense"
                          />
                          <FormControl fullWidth variant="outlined" margin="dense" size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                              label="Status"
                              value={editAnotacao.status || "aberta"}
                              onChange={(e) =>
                                setEditAnotacao((prev) => ({ ...prev, status: e.target.value }))
                              }
                            >
                              {STATUS_ANOTACAO.map((s) => (
                                <MenuItem key={s} value={s}>
                                  {s}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <Box display="flex" gap={8} mt={1}>
                            <Button
                              size="small"
                              color="primary"
                              variant="contained"
                              onClick={handleSalvarEdicaoAnotacao}
                              disabled={savingAnotacao}
                            >
                              {savingAnotacao ? <CircularProgress size={18} color="inherit" /> : "Guardar"}
                            </Button>
                            <Button
                              size="small"
                              disabled={savingAnotacao}
                              onClick={() => setEditAnotacao(null)}
                            >
                              Cancelar
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <>
                          <ListItemText
                            primary={new Date(an.createdAt).toLocaleString("pt-BR")}
                            secondary={
                              <span>
                                <Typography component="span" variant="body2" display="block">
                                  {an.texto || "(sem texto)"}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" display="block">
                                  Status: {an.status || "—"}
                                </Typography>
                                {an.arquivoUrl ? (
                                  <Link
                                    href={an.arquivoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    variant="caption"
                                  >
                                    {an.arquivoNome || "Ver anexo"}
                                  </Link>
                                ) : null}
                              </span>
                            }
                          />
                          <ListItemSecondaryAction style={{ display: "flex", alignItems: "center", gap: 0 }}>
                            <Tooltip title="Editar">
                              <IconButton
                                edge="end"
                                size="small"
                                aria-label="editar anotação"
                                disabled={savingAnotacao || loadingAnotacoes}
                                onClick={() =>
                                  setEditAnotacao({
                                    id: an.id,
                                    texto: an.texto || "",
                                    status: an.status || "aberta",
                                  })
                                }
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir">
                              <IconButton
                                edge="end"
                                size="small"
                                aria-label="excluir anotação"
                                disabled={savingAnotacao || loadingAnotacoes}
                                onClick={() => handleExcluirAnotacao(an.id)}
                              >
                                <DeleteOutline fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        </>
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </div>
          )}

          {activeTab === 2 && (
            <div className={classes.tabPanel}>
              <Typography variant="subtitle2" color="textSecondary" style={{ marginBottom: 12 }}>
                Criar lembrete do atendimento
              </Typography>
              <TextField fullWidth label="Nome do lembrete" value={formLembrete.nome} onChange={(e) => setFormLembrete({ ...formLembrete, nome: e.target.value })} className={classes.formField} />
              <TextField fullWidth multiline rows={2} label="Mensagem do lembrete" value={formLembrete.descricao} onChange={(e) => setFormLembrete({ ...formLembrete, descricao: e.target.value })} className={classes.formField} />
              <TextField fullWidth type="date" label="Data" value={formLembrete.data} onChange={(e) => setFormLembrete({ ...formLembrete, data: e.target.value })} InputLabelProps={{ shrink: true }} className={classes.formField} />
              <TextField fullWidth type="time" label="Hora" value={formLembrete.hora} onChange={(e) => setFormLembrete({ ...formLembrete, hora: e.target.value })} InputLabelProps={{ shrink: true }} className={classes.formField} />
              <FormControl fullWidth className={classes.formField}>
                <InputLabel>Escopo da notificação</InputLabel>
                <Select
                  value={formLembrete.destinoTipo}
                  onChange={(e) =>
                    setFormLembrete({
                      ...formLembrete,
                      destinoTipo: e.target.value,
                      destinoId: e.target.value === "usuario" ? formLembrete.destinoId : "",
                    })
                  }
                  label="Escopo da notificação"
                >
                  <MenuItem value="pessoal">Pessoal</MenuItem>
                  <MenuItem value="usuario">Usuário específico</MenuItem>
                  <MenuItem value="geral">Geral</MenuItem>
                </Select>
              </FormControl>
              {formLembrete.destinoTipo === "usuario" ? (
                <FormControl fullWidth className={classes.formField}>
                  <InputLabel>Usuário</InputLabel>
                  <Select
                    value={formLembrete.destinoId}
                    onChange={(e) => setFormLembrete({ ...formLembrete, destinoId: e.target.value })}
                    label="Usuário"
                    disabled={loadingUsers}
                  >
                    {users.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.name || u.email || `Usuário #${u.id}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : null}
              <FormControlLabel control={<Checkbox checked={formLembrete.addGoogle} onChange={(e) => setFormLembrete({ ...formLembrete, addGoogle: e.target.checked })} />} label="Adicionar ao calendário do Google" />
              <Button variant="contained" color="primary" fullWidth startIcon={<Add />} onClick={handleCriarLembrete} disabled={!canCreateLembrete} style={{ marginTop: 8 }}>
                {savingLembrete ? <CircularProgress size={18} color="inherit" /> : "Criar lembrete"}
              </Button>
              <Divider style={{ margin: "24px 0 16px" }} />
              <Box className={classes.reminderSummary}>
                <Paper elevation={0} className={classes.reminderMetric}>
                  <Typography variant="caption" color="textSecondary">Ativos</Typography>
                  <Typography variant="h6">{lembretesAtivos}</Typography>
                </Paper>
                <Paper elevation={0} className={classes.reminderMetric}>
                  <Typography variant="caption" color="textSecondary">Inativos</Typography>
                  <Typography variant="h6">{lembretesInativos}</Typography>
                </Paper>
                <Paper elevation={0} className={classes.reminderMetric}>
                  <Typography variant="caption" color="textSecondary">Próximo</Typography>
                  <Typography variant="body2" noWrap>
                    {proximoLembrete ? `${proximoLembrete.data} ${proximoLembrete.hora}` : "—"}
                  </Typography>
                </Paper>
              </Box>
              <Typography variant="subtitle2" style={{ marginBottom: 8 }}>Lembretes salvos</Typography>
              {loadingLembretes ? (
                <Box display="flex" justifyContent="center" py={2}>
                  <CircularProgress size={28} />
                </Box>
              ) : lembretes.length === 0 ? (
                <Typography variant="body2" className={classes.listEmpty}>
                  Nenhum lembrete salvo para este atendimento.
                </Typography>
              ) : (
                <Box>
                  {lembretes.map((lm) => (
                    <Paper
                      key={lm.id}
                      elevation={0}
                      className={`${classes.reminderCard} ${lm.ativo === false ? classes.reminderCardInactive : ""}`}
                    >
                      <Box className={classes.reminderTitleRow}>
                        <Box minWidth={0}>
                          <Typography variant="subtitle2" noWrap title={lm.nome}>
                            {lm.nome}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {lm.mensagemTemplate || lm.descricao || "Sem mensagem"}
                          </Typography>
                        </Box>
                        <Box className={classes.reminderActions}>
                          <Tooltip title={lm.ativo === false ? "Ativar" : "Desativar"}>
                            <Checkbox
                              size="small"
                              checked={lm.ativo !== false}
                              onChange={() => handleToggleLembrete(lm)}
                              disabled={savingLembrete}
                              inputProps={{ "aria-label": lm.ativo === false ? "Ativar lembrete" : "Desativar lembrete" }}
                            />
                          </Tooltip>
                          <Tooltip title="Histórico de disparos">
                            <IconButton size="small" onClick={() => handleAbrirHistoricoLembrete(lm)} disabled={savingLembrete}>
                              <History fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton size="small" onClick={() => handleExcluirLembrete(lm)} disabled={savingLembrete}>
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                      <Box className={classes.reminderMeta}>
                        <Chip size="small" label={lm.ativo === false ? "Inativo" : "Ativo"} color={lm.ativo === false ? "default" : "primary"} />
                        <Chip size="small" label={`${lm.data || "sem data"} ${lm.hora || ""}`.trim()} />
                        <Chip size="small" label={lembreteDestinoLabel(lm)} variant="outlined" />
                        <Chip size="small" label={lm.tipoGatilho || "agendado"} variant="outlined" />
                        {lm.addGoogle ? <Chip size="small" label="Google Calendar" variant="outlined" /> : null}
                        {lm.ultimoDisparoAt ? <Chip size="small" label={`Último disparo: ${new Date(lm.ultimoDisparoAt).toLocaleString("pt-BR")}`} variant="outlined" /> : null}
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={historicoOpen}
        onClose={() => setHistoricoOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle disableTypography style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6">Histórico — {historicoTitulo}</Typography>
          <IconButton onClick={() => setHistoricoOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent className={classes.modalContent}>
          {loadingHistorico ? (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={28} />
            </Box>
          ) : historicoDisparos.length === 0 ? (
            <Typography variant="body2" className={classes.listEmpty}>
              Nenhum disparo registrado para este lembrete.
            </Typography>
          ) : (
            <List dense>
              {historicoDisparos.map((d) => (
                <ListItem key={d.id} alignItems="flex-start">
                  <ListItemText
                    primary={`${new Date(d.createdAt).toLocaleString("pt-BR")} · ${d.status || "—"}`}
                    secondary={
                      <span>
                        <Typography component="span" variant="caption" display="block">
                          Gatilho: {d.tipoGatilho || "—"} · Interno: {d.canalInterno ? "sim" : "não"} · WhatsApp: {d.canalWhatsapp ? "sim" : "não"}
                        </Typography>
                        {d.lembrete?.mensagemTemplate || d.lembrete?.descricao || d.corpo ? (
                          <Typography component="span" variant="body2" display="block">
                            {d.lembrete?.mensagemTemplate || d.lembrete?.descricao || d.corpo}
                          </Typography>
                        ) : null}
                        {d.erroWhatsapp ? (
                          <Typography component="span" variant="caption" color="error" display="block">
                            {d.erroWhatsapp}
                          </Typography>
                        ) : null}
                      </span>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
