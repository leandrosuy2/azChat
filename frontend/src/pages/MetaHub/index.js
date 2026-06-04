import React, { useEffect, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import {
  Add,
  Autorenew,
  ChatBubbleOutline,
  Dashboard,
  DeleteOutline,
  Edit,
  FileCopy,
  Instagram,
  Link as LinkIcon,
  PlayArrow,
  Settings,
  Share
} from "@material-ui/icons";
import { Webhook as WebhookIcon } from "@mui/icons-material";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import MainContainer from "../../components/MainContainer";
import FlowBuilderModal from "../../components/FlowBuilderModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import { getBackendUrl } from "../../config";

const useStyles = makeStyles((theme) => ({
  page: {
    padding: theme.spacing(2),
    background: theme.mode === "dark" ? theme.palette.background.default : "#f6f7fb",
    minHeight: "100%"
  },
  hero: {
    borderRadius: 8,
    padding: theme.spacing(2.5),
    background:
      theme.mode === "dark"
        ? "linear-gradient(135deg, rgba(225,48,108,0.18), rgba(64,93,230,0.12))"
        : "linear-gradient(135deg, #fff 0%, #fff 48%, #ffe9f2 100%)",
    border: theme.mode === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid #eceef5",
    boxShadow: theme.mode === "dark" ? "none" : "0 12px 34px rgba(15, 23, 42, 0.08)"
  },
  tabsPaper: {
    marginTop: theme.spacing(2),
    borderRadius: 8,
    overflow: "hidden",
    border: theme.mode === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid #eceef5"
  },
  card: {
    height: "100%",
    borderRadius: 8,
    padding: theme.spacing(2),
    border: theme.mode === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid #eceef5",
    boxShadow: theme.mode === "dark" ? "none" : "0 10px 28px rgba(15, 23, 42, 0.06)"
  },
  statIcon: {
    width: 42,
    height: 42,
    background: "linear-gradient(135deg, #e1306c, #405de6)",
    color: "#fff"
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1.5),
    flexWrap: "wrap"
  },
  flowCanvas: {
    minHeight: 280,
    borderRadius: 8,
    padding: theme.spacing(2),
    background:
      theme.mode === "dark"
        ? "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)"
        : "radial-gradient(circle at 1px 1px, #d9deea 1px, transparent 0)",
    backgroundSize: "22px 22px",
    border: theme.mode === "dark" ? "1px dashed rgba(255,255,255,0.18)" : "1px dashed #cad1df"
  },
  block: {
    borderRadius: 8,
    padding: theme.spacing(1.5),
    background: theme.palette.background.paper,
    border: theme.mode === "dark" ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e7eaf3",
    boxShadow: theme.mode === "dark" ? "none" : "0 8px 20px rgba(15, 23, 42, 0.06)"
  },
  muted: {
    color: theme.palette.text.secondary
  },
  actions: {
    display: "flex",
    gap: theme.spacing(1),
    flexWrap: "wrap"
  }
}));

const tabs = [
  "Dashboard",
  "Contas conectadas",
  "Instagram Direct",
  "Flowbuilder Instagram",
  "Chatbot",
  "Automações",
  "Webhooks",
  "Configurações"
];

const blockTypes = [
  "Mensagem de texto",
  "Pergunta com opções",
  "Condição",
  "Encaminhar para atendente",
  "Adicionar tag",
  "Remover tag",
  "Enviar mídia",
  "Aguardar resposta",
  "Finalizar fluxo"
];

const MetaHub = () => {
  const classes = useStyles();
  const history = useHistory();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState([]);
  const [flows, setFlows] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [flowModalOpen, setFlowModalOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState(null);
  const [deleteInfo, setDeleteInfo] = useState(null);
  const [chatbotDraft, setChatbotDraft] = useState({
    greetingMessage: "",
    outOfHoursMessage: "",
    flowIdWelcome: "",
    chatbotEnabled: "enabled"
  });

  const activeTab = useMemo(() => {
    const value = Number(new URLSearchParams(location.search).get("tab"));
    return Number.isFinite(value) && value >= 0 && value < tabs.length ? value : 0;
  }, [location.search]);

  const selectedConnection = useMemo(
    () => connections.find((item) => String(item.id) === String(selectedConnectionId)) || connections[0],
    [connections, selectedConnectionId]
  );

  const instagramConnections = connections.filter((item) => item.channel === "instagram");
  const facebookConnections = connections.filter((item) => item.channel === "facebook");
  const activeConnections = connections.filter((item) => String(item.status).toUpperCase() === "CONNECTED");
  const activeFlows = flows.filter((flow) => flow.active === true || flow.active === "true");

  const setTab = (index) => {
    history.replace({ pathname: "/meta", search: `?tab=${index}` });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: whatsapps }, { data: flowData }] = await Promise.all([
        api.get("/whatsapp/"),
        api.get("/flowbuilder", { params: { channel: "instagram" } })
      ]);
      const metaConnections = (whatsapps || []).filter((item) =>
        ["instagram", "facebook"].includes(item.channel)
      );
      setConnections(metaConnections);
      setFlows(flowData?.flows || []);
      if (!selectedConnectionId && metaConnections[0]) {
        setSelectedConnectionId(String(metaConnections[0].id));
      }
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (connectionId) => {
    if (!connectionId) return;
    try {
      const { data } = await api.get(`/whatsapp/${connectionId}/meta-logs`);
      setLogs(data?.logs || data || []);
    } catch (err) {
      setLogs([]);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedConnection) return;
    setChatbotDraft({
      greetingMessage: selectedConnection.greetingMessage || "",
      outOfHoursMessage: selectedConnection.outOfHoursMessage || "",
      flowIdWelcome: selectedConnection.flowIdWelcome || "",
      chatbotEnabled: selectedConnection.disableBot ? "disabled" : "enabled"
    });
    loadLogs(selectedConnection.id);
  }, [selectedConnection?.id]);

  const openFlowModal = (flow = null) => {
    setEditingFlow(flow);
    setFlowModalOpen(true);
  };

  const closeFlowModal = () => {
    setEditingFlow(null);
    setFlowModalOpen(false);
  };

  const deleteFlow = async () => {
    if (!deleteInfo) return;
    try {
      await api.delete(`/flowbuilder/${deleteInfo.id}`);
      toast.success("Fluxo removido.");
      setDeleteInfo(null);
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const toggleFlow = async (flow) => {
    try {
      await api.put("/flowbuilder", {
        flowId: flow.id,
        name: flow.name,
        channels: flow.channels?.length ? flow.channels : ["instagram"],
        active: !flow.active
      });
      toast.success("Status do fluxo atualizado.");
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const copyText = async (text, success = "Copiado.") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(success);
    } catch (_) {
      toast.info(text);
    }
  };

  const testConnection = async (connectionId) => {
    try {
      await api.post(`/whatsapp/${connectionId}/test-meta`);
      toast.success("Conexão Meta validada.");
      loadLogs(connectionId);
    } catch (err) {
      toastError(err);
    }
  };

  const syncInstagram = async (connectionId) => {
    try {
      await api.post(`/instagram/${connectionId}/sync-dms`);
      toast.success("Sincronização do Instagram iniciada.");
    } catch (err) {
      toastError(err);
    }
  };

  const disconnect = async (connectionId) => {
    try {
      await api.delete(`/whatsapp/${connectionId}`);
      toast.success("Conta desconectada.");
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const saveChatbot = async () => {
    if (!selectedConnection) return;
    try {
      await api.put(`/whatsapp/${selectedConnection.id}`, {
        ...selectedConnection,
        greetingMessage: chatbotDraft.greetingMessage,
        outOfHoursMessage: chatbotDraft.outOfHoursMessage,
        flowIdWelcome: chatbotDraft.flowIdWelcome || null,
        disableBot: chatbotDraft.chatbotEnabled === "disabled"
      });
      toast.success("Chatbot atualizado.");
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const webhookUrl = selectedConnection
    ? `${getBackendUrl()}/webhooks/meta/${selectedConnection.companyId}/${selectedConnection.id}`
    : "";

  const statusChip = (value) => {
    const connected = String(value).toUpperCase() === "CONNECTED";
    return (
      <Chip
        size="small"
        label={connected ? "Ativa" : value || "Inativa"}
        style={{
          backgroundColor: connected ? "#e5f7ed" : "#fff2e5",
          color: connected ? "#18864b" : "#a15b00",
          fontWeight: 700
        }}
      />
    );
  };

  return (
    <MainContainer>
      <Box className={classes.page}>
        <FlowBuilderModal
          open={flowModalOpen}
          onClose={closeFlowModal}
          flowId={editingFlow?.id || null}
          nameWebhook={editingFlow?.name || ""}
          initialValues={editingFlow || { channels: ["instagram"] }}
          onSave={() => {
            closeFlowModal();
            loadData();
          }}
        />
        <ConfirmationModal
          title={deleteInfo ? `Remover fluxo ${deleteInfo.name}?` : "Remover fluxo"}
          open={Boolean(deleteInfo)}
          onClose={() => setDeleteInfo(null)}
          onConfirm={deleteFlow}
        >
          Esta ação remove o fluxo de Instagram selecionado.
        </ConfirmationModal>

        <Paper className={classes.hero}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box display="flex" alignItems="center" gridGap={14}>
                <Avatar className={classes.statIcon}>
                  <Instagram />
                </Avatar>
                <Box>
                  <Typography variant="h5" style={{ fontWeight: 800 }}>
                    Instagram/Facebook
                  </Typography>
                  <Typography className={classes.muted}>
                    Central de contas Meta, Instagram Direct, chatbots, webhooks e fluxos visuais.
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box className={classes.actions} justifyContent="flex-end">
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Add />}
                  onClick={() => history.push("/connections")}
                >
                  Conectar conta
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => openFlowModal()}
                >
                  Novo fluxo
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        <Paper className={classes.tabsPaper}>
          <Tabs
            value={activeTab}
            onChange={(_, value) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            indicatorColor="primary"
            textColor="primary"
          >
            {tabs.map((tab) => (
              <Tab key={tab} label={tab} />
            ))}
          </Tabs>
        </Paper>

        {loading && (
          <Box py={4} display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        )}

        {!loading && activeTab === 0 && (
          <Grid container spacing={2} style={{ marginTop: 8 }}>
            {[
              ["Contas Meta", connections.length, <LinkIcon />],
              ["Instagram Direct", instagramConnections.length, <Instagram />],
              ["Fluxos Instagram", flows.length, <Share />],
              ["Fluxos ativos", activeFlows.length, <PlayArrow />]
            ].map(([label, value, icon]) => (
              <Grid item xs={6} md={3} key={label}>
                <Paper className={classes.card}>
                  <Box display="flex" alignItems="center" gridGap={12}>
                    <Avatar className={classes.statIcon}>{icon}</Avatar>
                    <Box>
                      <Typography className={classes.muted} variant="caption">
                        {label}
                      </Typography>
                      <Typography variant="h4" style={{ fontWeight: 800 }}>
                        {value}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Paper className={classes.card}>
                <Box className={classes.sectionHeader}>
                  <Typography variant="h6">Próximas ações</Typography>
                </Box>
                <Grid container spacing={2}>
                  {blockTypes.map((type) => (
                    <Grid item xs={12} sm={6} md={4} key={type}>
                      <Box className={classes.block}>
                        <Typography style={{ fontWeight: 700 }}>{type}</Typography>
                        <Typography variant="body2" className={classes.muted}>
                          Disponível para composição dos fluxos visuais.
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        )}

        {!loading && activeTab === 1 && (
          <Grid container spacing={2} style={{ marginTop: 8 }}>
            {connections.map((connection) => (
              <Grid item xs={12} md={6} lg={4} key={connection.id}>
                <Paper className={classes.card}>
                  <Box className={classes.sectionHeader}>
                    <Box display="flex" alignItems="center" gridGap={10}>
                      <Avatar className={classes.statIcon}>
                        {connection.channel === "instagram" ? <Instagram /> : <Share />}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" style={{ fontWeight: 800 }}>
                          {connection.name}
                        </Typography>
                        <Typography variant="body2" className={classes.muted}>
                          {connection.channel === "instagram" ? "Instagram" : "Facebook"} · ID {connection.id}
                        </Typography>
                      </Box>
                    </Box>
                    {statusChip(connection.status)}
                  </Box>
                  <Divider style={{ margin: "12px 0" }} />
                  <Typography variant="body2" className={classes.muted}>
                    Conectada em {connection.createdAt ? new Date(connection.createdAt).toLocaleString() : "-"}
                  </Typography>
                  <Box className={classes.actions} mt={2}>
                    <Button size="small" variant="outlined" onClick={() => testConnection(connection.id)}>
                      Testar
                    </Button>
                    {connection.channel === "instagram" && (
                      <Button size="small" variant="outlined" onClick={() => syncInstagram(connection.id)}>
                        Sincronizar DMs
                      </Button>
                    )}
                    <Button size="small" color="secondary" onClick={() => disconnect(connection.id)}>
                      Desconectar
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {!loading && activeTab === 2 && (
          <Paper className={classes.card} style={{ marginTop: 16 }}>
            <Box className={classes.sectionHeader}>
              <Typography variant="h6">Instagram Direct</Typography>
              <Button variant="contained" color="primary" onClick={() => history.push("/connections")}>
                Conectar Instagram
              </Button>
            </Box>
            <Grid container spacing={2}>
              {instagramConnections.map((connection) => (
                <Grid item xs={12} md={6} key={connection.id}>
                  <Box className={classes.block}>
                    <Typography style={{ fontWeight: 800 }}>{connection.name}</Typography>
                    <Typography variant="body2" className={classes.muted}>
                      Recebimento de DMs, sincronização manual e webhook dedicado.
                    </Typography>
                    <Box className={classes.actions} mt={1.5}>
                      {statusChip(connection.status)}
                      <Button size="small" onClick={() => syncInstagram(connection.id)}>
                        Sincronizar
                      </Button>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {!loading && activeTab === 3 && (
          <Paper className={classes.card} style={{ marginTop: 16 }}>
            <Box className={classes.sectionHeader}>
              <Box>
                <Typography variant="h6">Flowbuilder Instagram</Typography>
                <Typography variant="body2" className={classes.muted}>
                  Crie blocos, condições, respostas automáticas e ações para Instagram.
                </Typography>
              </Box>
              <Button variant="contained" color="primary" startIcon={<Add />} onClick={() => openFlowModal()}>
                Novo fluxo Instagram
              </Button>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <Grid container spacing={1}>
                  {flows.map((flow) => (
                    <Grid item xs={12} key={flow.id}>
                      <Box className={classes.block}>
                        <Box className={classes.sectionHeader}>
                          <Box>
                            <Typography style={{ fontWeight: 800 }}>{flow.name}</Typography>
                            <Typography variant="body2" className={classes.muted}>
                              Status: {flow.active ? "ativo" : "rascunho/inativo"}
                            </Typography>
                          </Box>
                          <Chip size="small" label="Instagram" color="primary" />
                        </Box>
                        <Box className={classes.actions}>
                          <IconButton size="small" onClick={() => history.push(`/flowbuilder/${flow.id}`)}>
                            <Share fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => openFlowModal(flow)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => toggleFlow(flow)}>
                            <PlayArrow fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => setDeleteInfo(flow)}>
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
              <Grid item xs={12} md={7}>
                <Box className={classes.flowCanvas}>
                  <Grid container spacing={2}>
                    {blockTypes.slice(0, 6).map((type, index) => (
                      <Grid item xs={12} sm={6} key={type}>
                        <Box className={classes.block}>
                          <Typography variant="caption" className={classes.muted}>
                            Bloco {index + 1}
                          </Typography>
                          <Typography style={{ fontWeight: 800 }}>{type}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}

        {!loading && activeTab === 4 && (
          <Paper className={classes.card} style={{ marginTop: 16 }}>
            <Box className={classes.sectionHeader}>
              <Typography variant="h6">Chatbot Instagram</Typography>
              <TextField
                select
                size="small"
                variant="outlined"
                label="Conta"
                value={selectedConnection?.id || ""}
                onChange={(event) => setSelectedConnectionId(event.target.value)}
                style={{ minWidth: 240 }}
              >
                {connections.map((connection) => (
                  <MenuItem key={connection.id} value={connection.id}>
                    {connection.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  variant="outlined"
                  label="Mensagem inicial"
                  value={chatbotDraft.greetingMessage}
                  onChange={(event) => setChatbotDraft((prev) => ({ ...prev, greetingMessage: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  variant="outlined"
                  label="Resposta fora do horário"
                  value={chatbotDraft.outOfHoursMessage}
                  onChange={(event) => setChatbotDraft((prev) => ({ ...prev, outOfHoursMessage: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  variant="outlined"
                  label="Fluxo vinculado"
                  value={chatbotDraft.flowIdWelcome}
                  onChange={(event) => setChatbotDraft((prev) => ({ ...prev, flowIdWelcome: event.target.value }))}
                >
                  <MenuItem value="">Nenhum fluxo</MenuItem>
                  {flows.map((flow) => (
                    <MenuItem key={flow.id} value={flow.id}>
                      {flow.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  variant="outlined"
                  label="Status do chatbot"
                  value={chatbotDraft.chatbotEnabled}
                  onChange={(event) => setChatbotDraft((prev) => ({ ...prev, chatbotEnabled: event.target.value }))}
                >
                  <MenuItem value="enabled">Ativo</MenuItem>
                  <MenuItem value="disabled">Inativo</MenuItem>
                </TextField>
              </Grid>
            </Grid>
            <Box mt={2}>
              <Button variant="contained" color="primary" startIcon={<ChatBubbleOutline />} onClick={saveChatbot}>
                Salvar chatbot
              </Button>
            </Box>
          </Paper>
        )}

        {!loading && activeTab === 5 && (
          <Paper className={classes.card} style={{ marginTop: 16 }}>
            <Typography variant="h6">Automações</Typography>
            <Typography variant="body2" className={classes.muted}>
              Modelos operacionais para organizar respostas, tags, horários e encaminhamentos.
            </Typography>
            <Grid container spacing={2} style={{ marginTop: 8 }}>
              {["Resposta automática", "Encaminhar para atendente", "Adicionar tag", "Remover tag", "Finalizar atendimento", "Aguardar resposta"].map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item}>
                  <Box className={classes.block}>
                    <Typography style={{ fontWeight: 800 }}>{item}</Typography>
                    <Typography variant="body2" className={classes.muted}>
                      Configure esta ação dentro do Flowbuilder Instagram.
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {!loading && activeTab === 6 && (
          <Paper className={classes.card} style={{ marginTop: 16 }}>
            <Box className={classes.sectionHeader}>
              <Typography variant="h6">Webhooks</Typography>
              <TextField
                select
                size="small"
                variant="outlined"
                label="Conta"
                value={selectedConnection?.id || ""}
                onChange={(event) => setSelectedConnectionId(event.target.value)}
                style={{ minWidth: 240 }}
              >
                {connections.map((connection) => (
                  <MenuItem key={connection.id} value={connection.id}>
                    {connection.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <TextField
              fullWidth
              variant="outlined"
              label="URL do webhook"
              value={webhookUrl}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => copyText(webhookUrl, "URL do webhook copiada.")}>
                      <FileCopy />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Box mt={2} className={classes.actions}>
              <Button variant="outlined" startIcon={<WebhookIcon />} onClick={() => testConnection(selectedConnection?.id)}>
                Validar webhook
              </Button>
              <Button variant="outlined" startIcon={<Autorenew />} onClick={() => loadLogs(selectedConnection?.id)}>
                Atualizar eventos
              </Button>
            </Box>
            <Grid container spacing={1} style={{ marginTop: 12 }}>
              {logs.slice(0, 8).map((log) => (
                <Grid item xs={12} key={log.id || `${log.createdAt}-${log.eventType}`}>
                  <Box className={classes.block}>
                    <Typography style={{ fontWeight: 800 }}>
                      {log.eventType || log.action || "Evento recebido"}
                    </Typography>
                    <Typography variant="body2" className={classes.muted}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""} · {log.status || log.channel || ""}
                    </Typography>
                    {log.error && (
                      <Typography variant="body2" color="error">
                        {log.error}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {!loading && activeTab === 7 && (
          <Paper className={classes.card} style={{ marginTop: 16 }}>
            <Typography variant="h6">Configurações Meta</Typography>
            <Typography variant="body2" className={classes.muted}>
              Configure app id, app secret, verify token e integrações diretamente na conexão.
            </Typography>
            <Box mt={2} className={classes.actions}>
              <Button variant="contained" color="primary" startIcon={<Settings />} onClick={() => history.push("/connections")}>
                Abrir configurações de conexão
              </Button>
              <Button variant="outlined" onClick={() => history.push("/flowbuilders")}>
                Ver todos os flowbuilders
              </Button>
            </Box>
          </Paper>
        )}
      </Box>
    </MainContainer>
  );
};

export default MetaHub;
