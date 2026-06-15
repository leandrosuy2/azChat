import React, { useContext, useState, useEffect, useMemo } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { 
  Box, 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Avatar, 
  IconButton, 
  Paper, 
  Stack, 
  SvgIcon, 
  Tab, 
  Tabs,
  Divider
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  SaveAlt,
  Groups,
  FilterList,
  Call as CallIcon,
  HourglassEmpty as HourglassEmptyIcon,
  CheckCircle as CheckCircleIcon,
  RecordVoiceOver as RecordVoiceOverIcon,
  GroupAdd as GroupAddIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  EventNote as EventNoteIcon,
  Dashboard as DashboardIcon,
  Contacts as ContactsIcon,
  BarChart as BarChartIcon,
} from "@mui/icons-material";
import * as XLSX from 'xlsx';
import { toast } from "react-toastify";
import { isArray, isEmpty } from "lodash";
import moment from "moment";
import TableAttendantsStatus from "../../components/Dashboard/TableAttendantsStatus";
import { AuthContext } from "../../context/Auth/AuthContext";
import useDashboard from "../../hooks/useDashboard";
import { ChatsUser } from "./ChartsUser";
import ChartDonut from "./ChartDonut";
import Filters from "./Filters";
import { ChartsDate } from "./ChartsDate";
import ForbiddenPage from "../../components/ForbiddenPage";
import { i18n } from "../../translate/i18n";
import HelpHint from "../../components/HelpHint";
import MomentsUser from "../../components/MomentsUser";
import Reports from "../Reports";
import CommercialBiPanel from "../../components/Dashboard/CommercialBiPanel";
import CompanyFinancePanel from "../../components/Dashboard/CompanyFinancePanel";
import { getBackendUrl } from "../../config";
import canPerform from "../../utils/permissions";

const backendUrl = getBackendUrl();

const Dashboard = () => {
  const history = useHistory();
  const location = useLocation();
  const [counters, setCounters] = useState({});
  const [attendants, setAttendants] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [dateStartTicket, setDateStartTicket] = useState(moment().startOf('month').format("YYYY-MM-DD"));
  const [dateEndTicket, setDateEndTicket] = useState(moment().format("YYYY-MM-DD"));
  const [queueTicket, setQueueTicket] = useState(false);
  const [fetchDataFilter, setFetchDataFilter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const { user } = useContext(AuthContext);
  const isAdminDashboard = user?.super || user?.profile === "admin";
  const canViewAdminDashboard = isAdminDashboard || canPerform(user, "dashboard:view");
  const canViewLivePanel = isAdminDashboard || user?.allowRealTime === "enabled";

  const hubTabs = useMemo(() => ([
    { key: "indicators", label: isAdminDashboard ? "Indicadores" : "Meu painel", visible: true },
    { key: "reports", label: "Relatorios", visible: canViewAdminDashboard },
    { key: "live", label: "Painel ao vivo", visible: canViewLivePanel },
    { key: "commercial", label: "BI Comercial", visible: canViewAdminDashboard },
    { key: "finance", label: "Financeiro", visible: canViewAdminDashboard },
  ].filter((tab) => tab.visible)), [canViewAdminDashboard, canViewLivePanel, isAdminDashboard]);

  const hubTab = useMemo(() => {
    const hub = new URLSearchParams(location.search).get("hub");
    const idx = hubTabs.findIndex((tab) => tab.key === hub);
    return idx >= 0 ? idx : 0;
  }, [hubTabs, location.search]);

  const setHubTab = (index) => {
    const key = hubTabs[index]?.key || "indicators";
    const search = index === 0 ? "" : `?hub=${key}`;
    history.replace({ pathname: "/", search });
  };
  
  const { find } = useDashboard();

  useEffect(() => {
    async function firstLoad() {
      await fetchData();
    }
    setTimeout(() => {
      firstLoad();
    }, 1000);
  }, [fetchDataFilter]);

  async function fetchData() {
    setLoading(true);
    let params = {};
    if (!isEmpty(dateStartTicket) && moment(dateStartTicket).isValid()) {
      params = { ...params, date_from: moment(dateStartTicket).format("YYYY-MM-DD") };
    }
    if (!isEmpty(dateEndTicket) && moment(dateEndTicket).isValid()) {
      params = { ...params, date_to: moment(dateEndTicket).format("YYYY-MM-DD") };
    }
    if (Object.keys(params).length === 0) {
      toast.error("Parametrize o filtro");
      setLoading(false);
      return;
    }
    const data = await find(params);
    setCounters(data.counters);
    if (isArray(data.attendants)) {
      setAttendants(data.attendants);
    } else {
      setAttendants([]);
    }
    setLoading(false);
  }

  const exportarGridParaExcel = () => {
    const ws = XLSX.utils.table_to_sheet(document.getElementById('grid-attendants'));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RelatorioDeAtendentes');
    XLSX.writeFile(wb, 'relatorio-de-atendentes.xlsx');
  };

  const GetUsers = () => {
    let userOnline = 0;
    attendants.forEach(user => {
      if (user.online === true) {
        userOnline = userOnline + 1;
      }
    });
    return userOnline;
  };

  function toggleShowFilter() {
    setShowFilter(!showFilter);
  }

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const detailTabs = useMemo(() => ([
    { key: "performance", label: isAdminDashboard ? i18n.t("dashboard.tabs.performance") : "Minha atividade" },
    { key: "assessments", label: isAdminDashboard ? i18n.t("dashboard.tabs.assessments") : "Minhas avaliacoes" },
    { key: "attendants", label: i18n.t("dashboard.tabs.attendants"), visible: isAdminDashboard },
  ].filter((tab) => tab.visible !== false)), [isAdminDashboard]);

  useEffect(() => {
    if (activeTab > detailTabs.length - 1) {
      setActiveTab(0);
    }
  }, [activeTab, detailTabs.length]);

  const activeDetailTab = detailTabs[activeTab]?.key || "performance";

  if (user.profile === "user" && user.showDashboard === "disabled") {
    return <ForbiddenPage />;
  }

  const adminStatCards = [
    {
      title: i18n.t("dashboard.cards.inAttendance"),
      value: counters.supportHappening || 0,
      icon: <CallIcon />,
      color: "#3598dc"
    },
    {
      title: i18n.t("dashboard.cards.waiting"),
      value: counters.supportPending || 0,
      icon: <HourglassEmptyIcon />,
      color: "#32c5d2"
    },
    {
      title: i18n.t("dashboard.cards.finalized"),
      value: counters.supportFinished || 0,
      icon: <CheckCircleIcon />,
      color: "#26c281"
    },
    {
      title: i18n.t("dashboard.cards.groups"),
      value: counters.supportGroups || 0,
      icon: <Groups />,
      color: "#8e44ad"
    },
    {
      title: i18n.t("dashboard.cards.activeAttendants"),
      value: `${GetUsers() || 0}/${attendants.length || 0}`,
      icon: <RecordVoiceOverIcon />,
      color: "#e7505a"
    },
    {
      title: i18n.t("dashboard.cards.newContacts"),
      value: counters.leads || 0,
      icon: <GroupAddIcon />,
      color: "#f39c12"
    }
  ];
  const userStatCards = [
    {
      title: "Meus atendimentos",
      value: counters.supportHappening || 0,
      icon: <CallIcon />,
      color: "#2563eb"
    },
    {
      title: "Pendentes nas minhas filas",
      value: counters.supportPending || 0,
      icon: <HourglassEmptyIcon />,
      color: "#0f766e"
    },
    {
      title: "Finalizados por mim",
      value: counters.supportFinished || 0,
      icon: <CheckCircleIcon />,
      color: "#16a34a"
    },
    {
      title: "Novos contatos atendidos",
      value: counters.leads || 0,
      icon: <GroupAddIcon />,
      color: "#d97706"
    },
    {
      title: "Avaliacoes recebidas",
      value: counters.withRating || 0,
      icon: <AssignmentTurnedInIcon />,
      color: "#7c3aed"
    },
    {
      title: "Score NPS",
      value: counters.npsScore || 0,
      icon: <BarChartIcon />,
      color: "#db2777"
    }
  ];
  const statCards = isAdminDashboard ? adminStatCards : userStatCards;
  const shortcuts = [
    { label: "Atendimentos", helper: "Abrir minha fila de conversas", icon: <CallIcon />, path: "/tickets", color: "#2563eb" },
    { label: "Agenda", helper: "Ver compromissos e lembretes", icon: <EventNoteIcon />, path: "/schedules", color: "#0f766e" },
    { label: "Kanban", helper: "Organizar cards e etapas", icon: <DashboardIcon />, path: "/kanban", color: "#7c3aed" },
    { label: "Contatos", helper: "Consultar clientes e historico", icon: <ContactsIcon />, path: "/contacts", color: "#d97706" },
  ];

  const softShadow = "0 12px 34px rgba(15, 23, 42, 0.08)";
  const panelBorder = "1px solid rgba(226, 232, 240, 0.9)";
  const userInitial = (user?.name || "A").trim().charAt(0).toUpperCase();
  const userProfileUrl = user?.profileImage
    ? `${backendUrl}/public/company${user.companyId}/user/${user.profileImage}`
    : undefined;

  return (
    <Box sx={{ backgroundColor: "#f7f8fc", minHeight: "100vh", py: { xs: 2, md: 3 } }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2.5 } }}>
        {/* Header with filter button */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 1.5, mb: 2, flexDirection: { xs: "column", sm: "row" } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h5" fontWeight={800} color="#10162f" sx={{ letterSpacing: 0 }}>
              {isAdminDashboard ? "Painel operacional" : "Meu painel"}
            </Typography>
            <HelpHint areaKey="dashboard" />
          </Box>
          <IconButton onClick={toggleShowFilter} color="primary" size="small" sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: "#fff", border: panelBorder, boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)" }}>
            <FilterList />
          </IconButton>
        </Box>

        <Paper sx={{ mb: 2.5, borderRadius: 2, boxShadow: "0 8px 22px rgba(15, 23, 42, 0.06)", border: panelBorder, overflow: "hidden" }}>
          <Tabs
            value={hubTab}
            onChange={(_, v) => setHubTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            textColor="primary"
            indicatorColor="primary"
            sx={{
              minHeight: 58,
              px: 1,
              "& .MuiTab-root": {
                minHeight: 58,
                fontWeight: 700,
                fontSize: 15,
                textTransform: "uppercase",
                color: "#4a5568",
                px: { xs: 2, md: 3 }
              },
              "& .Mui-selected": { color: "#5b2be0" },
              "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0", background: "#5b2be0" }
            }}
          >
            {hubTabs.map((tab) => (
              <Tab key={tab.key} label={tab.label} />
            ))}
          </Tabs>
        </Paper>

        {hubTabs[hubTab]?.key === "reports" && (
          <Paper sx={{ p: 0, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", mb: 3, overflow: "hidden" }}>
            <Reports embedded />
          </Paper>
        )}

        {hubTabs[hubTab]?.key === "live" && (
          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", mb: 3, minHeight: "70vh" }}>
            <Box display="flex" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight="bold">
                Painel de atendimentos
              </Typography>
              <HelpHint areaKey="moments" />
            </Box>
            <MomentsUser />
          </Paper>
        )}

        {hubTabs[hubTab]?.key === "commercial" && (
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", mb: 3 }}>
            <CommercialBiPanel />
          </Paper>
        )}

        {hubTabs[hubTab]?.key === "finance" && (
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", mb: 3 }}>
            <CompanyFinancePanel />
          </Paper>
        )}

        {hubTabs[hubTab]?.key === "indicators" && (
        <>
        <Paper
          sx={{
            mb: 1.75,
            p: { xs: 1.5, sm: 2 },
            borderRadius: 2,
            border: panelBorder,
            boxShadow: softShadow,
            overflow: "hidden",
            position: "relative",
            background: "linear-gradient(110deg, #ffffff 0%, #ffffff 58%, #efe8ff 100%)"
          }}
        >
          <Box
            sx={{
              position: "absolute",
              right: { xs: -30, md: 48 },
              bottom: -10,
              width: { xs: 110, md: 170 },
              height: { xs: 64, md: 96 },
              borderRadius: "48% 52% 0 0",
              background: "linear-gradient(135deg, rgba(91,43,224,0.14), rgba(91,43,224,0.02))"
            }}
          />
          <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, sm: 2 }} sx={{ position: "relative" }}>
            <Avatar
              src={userProfileUrl}
              alt={user?.name || "Atendente"}
              sx={{
                width: { xs: 52, sm: 64, md: 72 },
                height: { xs: 52, sm: 64, md: 72 },
                bgcolor: "#5b2be0",
                color: "#fff",
                fontWeight: 800,
                fontSize: { xs: 22, sm: 26, md: 30 },
                border: "4px solid #eee7ff",
                boxShadow: "0 12px 28px rgba(91, 43, 224, 0.18)"
              }}
            >
              {userInitial}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={800} color="#10162f" sx={{ mb: 0.25, fontSize: { xs: 18, sm: 20 } }}>
                Bem-vindo, {user?.name || "Atendente"}
              </Typography>
              <Typography variant="body2" color="#596275" sx={{ maxWidth: 620, lineHeight: 1.4, fontSize: { xs: 12.5, sm: 13.5 } }}>
                {isAdminDashboard
                  ? "Acompanhe atendimentos, metas e indicadores em um painel organizado para decisao rapida."
                  : "Acompanhe sua rotina de atendimentos, pendencias e resultados sem misturar dados administrativos."}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Filters Section */}
        {showFilter && (
          <Paper 
            sx={{ 
              p: 2, 
              mb: 3, 
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
            }}
          >
            <Filters
              setDateStartTicket={setDateStartTicket}
              setDateEndTicket={setDateEndTicket}
              dateStartTicket={dateStartTicket}
              dateEndTicket={dateEndTicket}
              setQueueTicket={setQueueTicket}
              queueTicket={queueTicket}
              fetchData={setFetchDataFilter}
            />
          </Paper>
        )}

        {/* Statistics Cards */}
        <Grid container spacing={1.5} sx={{ mb: 2.25 }}>
          {statCards.map((card, index) => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={index}>
              <Card 
                sx={{ 
                  height: "100%",
                  borderRadius: 2,
                  border: panelBorder,
                  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.07)",
                  transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 14px 32px rgba(15, 23, 42, 0.12)"
                  }
                }}
              >
                <CardContent sx={{ p: { xs: 1.25, sm: 1.5 } }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={{ xs: 1, sm: 1.25 }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: `${card.color}18`,
                        color: card.color,
                        width: { xs: 38, sm: 44 },
                        height: { xs: 38, sm: 44 }
                      }}
                    >
                      <SvgIcon sx={{ fontSize: { xs: 20, sm: 24 } }}>{card.icon}</SvgIcon>
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography 
                        variant="overline" 
                        sx={{ 
                          fontWeight: 600,
                          fontSize: { xs: "0.62rem", sm: "0.68rem" },
                          color: "text.secondary",
                          lineHeight: 1.15,
                          display: "block",
                          whiteSpace: "normal"
                        }}
                      >
                        {card.title}
                      </Typography>
                      <Typography 
                        variant="h4"
                        sx={{ 
                          fontWeight: 800,
                          color: card.color,
                          lineHeight: 1,
                          fontSize: { xs: 24, sm: 30 }
                        }}
                      >
                        {card.value}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {!isAdminDashboard && (
          <Grid container spacing={1.5} sx={{ mb: 2.25 }}>
            {shortcuts.map((shortcut) => (
              <Grid item xs={12} sm={6} md={3} key={shortcut.label}>
                <Card
                  onClick={() => history.push(shortcut.path)}
                  sx={{
                    height: "100%",
                    cursor: "pointer",
                    borderRadius: 2,
                    border: panelBorder,
                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.07)",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 14px 30px rgba(15, 23, 42, 0.12)"
                    }
                  }}
                >
                  <CardContent sx={{ p: 1.5 }}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Avatar sx={{ bgcolor: `${shortcut.color}16`, color: shortcut.color, width: 42, height: 42 }}>
                        {shortcut.icon}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={800} color="#10162f" sx={{ fontSize: 15 }}>
                          {shortcut.label}
                        </Typography>
                        <Typography color="#64748b" sx={{ fontSize: 12.5, lineHeight: 1.25 }}>
                          {shortcut.helper}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Tabs Navigation */}
        <Paper sx={{ 
          mb: 3, 
          borderRadius: 2,
          border: panelBorder,
          boxShadow: "0 8px 22px rgba(15, 23, 42, 0.06)",
          overflow: "hidden"
        }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              "& .MuiTab-root": {
                minHeight: 54,
                fontWeight: 700,
                textTransform: "none"
              },
              "& .Mui-selected": { color: "#5b2be0" },
              "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0", background: "#5b2be0" }
            }}
          >
            {detailTabs.map((tab) => (
              <Tab key={tab.key} label={tab.label} />
            ))}
          </Tabs>
        </Paper>

        {/* Tab Panels */}
        {/* Performance Tab */}
        {activeDetailTab === "performance" && (
          <Paper 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
            }}
          >
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {isAdminDashboard ? i18n.t("dashboard.charts.performance") : "Minha atividade no periodo"}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <ChartsDate />
          </Paper>
        )}

        {/* Assessments Tab - NPS Data */}
        {activeDetailTab === "assessments" && (
          <Paper 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)" 
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                {isAdminDashboard ? i18n.t("dashboard.tabs.assessments") : "Minhas avaliacoes"}
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              {/* Main NPS Score */}
              <Grid item xs={12} md={3}>
                <Card 
                  sx={{ 
                    height: "100%",
                    borderRadius: 2,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                    bgcolor: "#f8f9fa" 
                  }}
                >
                  <CardContent>
                    <ChartDonut
                      data={[
                        `{'name': 'Promotores', 'value': ${counters.npsPromotersPerc || 100}}`,
                        `{'name': 'Detratores', 'value': ${counters.npsDetractorsPerc || 0}}`,
                        `{'name': 'Neutros', 'value': ${counters.npsPassivePerc || 0}}`
                      ]}
                      value={counters.npsScore || 0}
                      title="Score"
                      color={(parseInt(counters.npsPromotersPerc || 0) + parseInt(counters.npsDetractorsPerc || 0) + parseInt(counters.npsPassivePerc || 0)) === 0 ? ["#918F94"] : ["#2EA85A", "#F73A2C", "#F7EC2C"]}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Promoters */}
              <Grid item xs={12} md={3}>
                <Card 
                  sx={{ 
                    height: "100%",
                    borderRadius: 2,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                    bgcolor: "#f8f9fa" 
                  }}
                >
                  <CardContent>
                    <ChartDonut
                      title={i18n.t("dashboard.assessments.prosecutors")}
                      value={counters.npsPromotersPerc || 0}
                      data={[`{'name': 'Promotores', 'value': 100}`]}
                      color={["#2EA85A"]}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Neutral */}
              <Grid item xs={12} md={3}>
                <Card 
                  sx={{ 
                    height: "100%",
                    borderRadius: 2,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                    bgcolor: "#f8f9fa" 
                  }}
                >
                  <CardContent>
                    <ChartDonut
                      data={[`{'name': 'Neutros', 'value': 100}`]}
                      title={i18n.t("dashboard.assessments.neutral")}
                      value={counters.npsPassivePerc || 0}
                      color={["#F7EC2C"]}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Detractors */}
              <Grid item xs={12} md={3}>
                <Card 
                  sx={{ 
                    height: "100%",
                    borderRadius: 2,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                    bgcolor: "#f8f9fa" 
                  }}
                >
                  <CardContent>
                    <ChartDonut
                      data={[`{'name': 'Detratores', 'value': 100}`]}
                      title={i18n.t("dashboard.assessments.detractors")}
                      value={counters.npsDetractorsPerc || 0}
                      color={["#F73A2C"]}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Assessment Summary */}
              <Grid item xs={12}>
                <Card 
                  sx={{ 
                    borderRadius: 2,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                    bgcolor: "#f8f9fa" 
                  }}
                >
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ textAlign: "center", p: 2 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {i18n.t("dashboard.assessments.totalCalls")}
                          </Typography>
                          <Typography variant="h4" fontWeight="bold" color="primary">
                            {counters.tickets || 0}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ textAlign: "center", p: 2 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {i18n.t("dashboard.assessments.ratedCalls")}
                          </Typography>
                          <Typography variant="h4" fontWeight="bold" color="primary">
                            {counters.withRating || 0}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ textAlign: "center", p: 2 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {i18n.t("dashboard.assessments.evaluationIndex")}
                          </Typography>
                          <Typography variant="h4" fontWeight="bold" color="primary">
                            {Number(counters.percRating / 100 || 0).toLocaleString(undefined, { style: 'percent' })}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Attendants Tab */}
        {activeDetailTab === "attendants" && isAdminDashboard && (
          <Paper 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)" 
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                {i18n.t("dashboard.tabs.attendants")}
              </Typography>
              
              <IconButton 
                onClick={exportarGridParaExcel} 
                color="primary"
                size="small"
                sx={{ 
                  bgcolor: "rgba(53, 152, 220, 0.1)",
                  "&:hover": {
                    bgcolor: "rgba(53, 152, 220, 0.2)"
                  }
                }}
              >
                <SaveAlt />
              </IconButton>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <div id="grid-attendants">
              {attendants.length > 0 && (
                <TableAttendantsStatus 
                  attendants={attendants} 
                  loading={loading} 
                />
              )}
            </div>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {i18n.t("dashboard.charts.userPerformance")}
              </Typography>
              <ChatsUser />
            </Box>
          </Paper>
        )}
        </>
        )}
      </Container>
    </Box>
  );
};

export default Dashboard;
