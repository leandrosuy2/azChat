import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from "react";
import { useParams, useHistory, useLocation } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";
import Button from "@material-ui/core/Button";
import Link from "@material-ui/core/Link";
import TextField from "@material-ui/core/TextField";
import MenuItem from "@material-ui/core/MenuItem";
import InputAdornment from "@material-ui/core/InputAdornment";
import Chip from "@material-ui/core/Chip";
import IconButton from "@material-ui/core/IconButton";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import MenuBookIcon from "@material-ui/icons/MenuBook";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import SearchIcon from "@material-ui/icons/Search";
import EditIcon from "@material-ui/icons/Edit";
import OndemandVideoIcon from "@material-ui/icons/OndemandVideo";
import PictureAsPdfIcon from "@material-ui/icons/PictureAsPdf";
import DescriptionIcon from "@material-ui/icons/Description";
import Markdown from "markdown-to-jsx";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker.entry";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import HelpsManager from "../../components/HelpsManager";
import { AuthContext } from "../../context/Auth/AuthContext";
import useHelps from "../../hooks/useHelps";
import { i18n } from "../../translate/i18n";

const backendUrl = process.env.REACT_APP_BACKEND_URL;
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

// Extrai o ID de vídeo do YouTube de URL completa, encurtada ou só o ID.
const toYoutubeEmbed = (video) => {
  if (!video) return null;
  const trimmed = String(video).trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  if (/^[\w-]{11}$/.test(trimmed)) {
    return `https://www.youtube.com/embed/${trimmed}`;
  }
  return null;
};

const TUTORIAL_TYPES = {
  video: "video",
  markdown: "markdown",
  pdf: "pdf",
};

const AREA_ROUTES = {
  dashboard: "/",
  moments: "/moments",
  tickets: "/tickets",
  notifications: "/notifications",
  "quick-messages": "/quick-messages",
  kanban: "/kanban",
  connections: "/connections",
  "all-connections": "/allConnections",
  contacts: "/contacts",
  "contact-lists": "/contact-lists",
  tags: "/tags",
  schedules: "/schedules",
  chats: "/chats",
  helps: "/helps",
  tutorials: "/tutoriais",
  campaigns: "/campaigns",
  "campaigns-config": "/campaigns-config",
  flowbuilder: "/flowbuilders",
  announcements: "/announcements",
  "messages-api": "/messages-api",
  users: "/users",
  queues: "/queues",
  prompts: "/prompts",
  "queue-integration": "/queue-integration",
  files: "/files",
  budgets: "/financeiro",
  settings: "/settings",
  companies: "/companies",
};

const getTutorialType = (tutorial = {}) => {
  if ((tutorial.attachments || []).some((att) => att.type === "pdf" || att.mimetype === "application/pdf")) {
    return TUTORIAL_TYPES.pdf;
  }

  if (tutorial.video) {
    return TUTORIAL_TYPES.video;
  }

  return TUTORIAL_TYPES.markdown;
};

const getTypeLabel = (type) => {
  if (type === TUTORIAL_TYPES.video) return i18n.t("helps.tutorialTypes.video");
  if (type === TUTORIAL_TYPES.pdf) return "PDF";
  return i18n.t("helps.tutorialTypes.markdown");
};

const getTypeIcon = (type) => {
  if (type === TUTORIAL_TYPES.video) return <OndemandVideoIcon />;
  if (type === TUTORIAL_TYPES.pdf) return <PictureAsPdfIcon />;
  return <DescriptionIcon />;
};

const getAreaLabel = (areaKey, fallback) => {
  if (!areaKey) return fallback || "";
  const translationKey = `helps.areaLabels.${areaKey}`;
  const translated = i18n.t(translationKey);

  return translated === translationKey ? fallback || areaKey : translated;
};

const useStyles = makeStyles((theme) => ({
  root: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    padding: theme.spacing(2),
    ...theme.scrollbarStyles,
  },
  listPaper: {
    padding: theme.spacing(0),
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: theme.spacing(2),
    alignContent: "flex-start",
    backgroundColor: "transparent",
    boxShadow: "none",
  },
  filtersPaper: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    display: "grid",
    gridTemplateColumns: "minmax(260px, 1fr) repeat(2, minmax(160px, 220px)) auto",
    gap: theme.spacing(1.5),
    alignItems: "center",
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
    },
  },
  card: {
    padding: theme.spacing(2),
    cursor: "pointer",
    transition: "all 0.2s ease",
    border: "1px solid",
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 8,
    minHeight: 190,
    display: "flex",
    flexDirection: "column",
    position: "relative",
    justifyContent: "space-between",
    "&:hover": {
      boxShadow: theme.shadows[4],
      borderColor: theme.palette.primary.main,
      transform: "translateY(-2px)",
    },
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(1),
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: theme.palette.primary.main,
    backgroundColor: theme.mode === "light" ? "rgba(25, 118, 210, 0.08)" : "rgba(255,255,255,0.08)",
    flex: "0 0 auto",
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(0.5),
    paddingRight: theme.spacing(4),
  },
  cardDescription: {
    color: theme.palette.text.secondary,
    fontSize: "0.9rem",
    lineHeight: 1.45,
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(1),
    borderTop: "1px solid rgba(0,0,0,0.08)",
  },
  editButton: {
    position: "absolute",
    top: theme.spacing(1),
    right: theme.spacing(1),
  },
  emptyState: {
    padding: theme.spacing(4),
    textAlign: "center",
  },
  docWrapper: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  docPaper: {
    padding: theme.spacing(3, 4),
    maxWidth: 1120,
    margin: "0 auto",
    marginBottom: theme.spacing(4),
    "& h1": {
      marginTop: 0,
      paddingBottom: theme.spacing(1),
      borderBottom: "2px solid",
      borderColor: theme.palette.primary.main,
    },
    "& h2": {
      marginTop: theme.spacing(2.5),
      marginBottom: theme.spacing(1),
    },
    "& h3": {
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(0.5),
    },
    "& p": {
      lineHeight: 1.7,
      marginBottom: theme.spacing(1.5),
    },
    "& ul, & ol": {
      paddingLeft: theme.spacing(2.5),
      marginBottom: theme.spacing(1.5),
    },
    "& li": {
      marginBottom: theme.spacing(0.5),
    },
    "& table": {
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: theme.spacing(2),
    },
    "& th, & td": {
      border: "1px solid",
      borderColor: "rgba(0,0,0,0.12)",
      padding: theme.spacing(1, 1.5),
      textAlign: "left",
    },
    "& th": {
      backgroundColor: "rgba(0,0,0,0.04)",
      fontWeight: 600,
    },
    "& hr": {
      border: "none",
      borderTop: "1px solid",
      borderColor: "rgba(0,0,0,0.08)",
      margin: theme.spacing(2, 0),
    },
  },
  pdfDocPaper: {
    maxWidth: 1180,
    backgroundColor: "transparent",
    boxShadow: "none",
    padding: theme.spacing(1, 0, 4),
  },
  docHeader: {
    maxWidth: 1120,
    margin: "0 auto",
    marginBottom: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1),
  },
  docActions: {
    display: "flex",
    gap: theme.spacing(1),
    flexWrap: "wrap",
  },
  videoWrapper: {
    position: "relative",
    paddingBottom: "56.25%",
    height: 0,
    marginBottom: theme.spacing(3),
    "& iframe": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      border: 0,
      borderRadius: theme.spacing(1),
    },
  },
  image: {
    maxWidth: "100%",
    borderRadius: 4,
    marginTop: theme.spacing(2),
    display: "block",
  },
  attachment: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: theme.spacing(1),
  },
  pdfViewer: {
    width: "100%",
    backgroundColor: theme.mode === "light" ? "#f3f5f7" : "rgba(255,255,255,0.05)",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 8,
    padding: theme.spacing(3, 1),
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    overflow: "auto",
    "& .react-pdf__Document": {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: theme.spacing(2),
    },
    "& .react-pdf__Page": {
      boxShadow: theme.shadows[2],
      backgroundColor: "#fff",
    },
    "& .react-pdf__Page canvas": {
      maxWidth: "100%",
      height: "auto !important",
    },
  },
  pdfActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: theme.spacing(2),
  },
  backButton: {
    marginBottom: theme.spacing(2),
  },
  loadingBox: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  errorBox: {
    padding: theme.spacing(2),
    textAlign: "center",
    color: theme.palette.error.main,
  },
  managerWrapper: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
}));

const Tutoriais = () => {
  const classes = useStyles();
  const { slug } = useParams();
  const history = useHistory();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { list, listAreas } = useHelps();
  const pdfContainerRef = useRef(null);

  const [records, setRecords] = useState([]);
  const [areas, setAreas] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [manageMode, setManageMode] = useState(false);
  const [editingTutorialId, setEditingTutorialId] = useState(null);
  const [creatingAreaKey, setCreatingAreaKey] = useState("");
  const [searchParam, setSearchParam] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [pdfWidth, setPdfWidth] = useState(960);
  const [pdfPages, setPdfPages] = useState({});
  const canManage = user?.profile === "admin";
  const isManaging = canManage && manageMode;

  const areaOptions = useMemo(() => {
    return Array.from(
      new Set([
        ...records.map((item) => item.areaKey).filter(Boolean),
        areaFilter !== "all" ? areaFilter : null,
      ].filter(Boolean))
    ).sort();
  }, [records, areaFilter]);

  const areaLabelByKey = useMemo(() => {
    return areas.reduce((acc, area) => {
      acc[area.key] = getAreaLabel(area.key, area.label);
      return acc;
    }, {});
  }, [areas]);

  const getDisplayAreaLabel = useCallback((areaKey) => {
    return areaLabelByKey[areaKey] || getAreaLabel(areaKey);
  }, [areaLabelByKey]);

  const filteredRecords = useMemo(() => {
    const search = searchParam.trim().toLowerCase();

    return records.filter((item) => {
      const tutorialType = getTutorialType(item);
      const matchesType = typeFilter === "all" || tutorialType === typeFilter;
      const matchesArea = areaFilter === "all" || item.areaKey === areaFilter;
      const matchesSearch =
        !search ||
        [item.title, item.description, item.content, item.areaKey, getDisplayAreaLabel(item.areaKey)]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));

      return matchesType && matchesArea && matchesSearch;
    });
  }, [records, searchParam, typeFilter, areaFilter, getDisplayAreaLabel]);

  const refreshTutorials = useCallback(async () => {
    try {
      const data = await list();
      setRecords(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError("Não foi possível carregar os tutoriais.");
    }
  }, [list]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      list(),
      listAreas().catch(() => []),
    ])
      .then(([data, areaList]) => {
        if (!active) return;
        setRecords(Array.isArray(data) ? data : []);
        setAreas(Array.isArray(areaList) ? areaList : []);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar os tutoriais.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [list, listAreas]);

  useEffect(() => {
    const area = new URLSearchParams(location.search).get("area");
    if (area) {
      setAreaFilter(area);
    }
  }, [location.search]);

  useEffect(() => {
    if (!slug) {
      setCurrent(null);
      return;
    }
    const found = records.find((r) => String(r.id) === String(slug));
    setCurrent(found || null);
  }, [slug, records]);

  useEffect(() => {
    const updatePdfWidth = () => {
      const containerWidth = pdfContainerRef.current?.getBoundingClientRect().width;
      const availableWidth = containerWidth || window.innerWidth - 96;
      setPdfWidth(Math.max(320, Math.min(1000, availableWidth - 48)));
    };

    updatePdfWidth();
    window.addEventListener("resize", updatePdfWidth);

    return () => {
      window.removeEventListener("resize", updatePdfWidth);
    };
  }, [current]);

  const handleOpenTutorial = (id) => {
    history.push(`/tutoriais/${id}`);
  };

  const handleEditTutorial = (event, id) => {
    if (event) {
      event.stopPropagation();
    }
    setEditingTutorialId(id);
    setCreatingAreaKey("");
    setManageMode(true);
    if (slug) {
      history.push("/tutoriais");
    }
  };

  const handleCreateTutorial = () => {
    setEditingTutorialId(null);
    setCreatingAreaKey(areaFilter !== "all" ? areaFilter : "");
    setManageMode(true);
    history.replace("/tutoriais");
  };

  const handleToggleManage = async () => {
    if (manageMode) {
      await refreshTutorials();
      setEditingTutorialId(null);
      setCreatingAreaKey("");
    }
    setManageMode((prev) => !prev);
  };

  const handlePdfLoadSuccess = (attachmentId, { numPages }) => {
    setPdfPages((prev) => ({
      ...prev,
      [attachmentId]: numPages,
    }));
  };

  const handleOpenArea = (areaKey) => {
    const route = AREA_ROUTES[areaKey];
    if (route) {
      history.push(route);
    }
  };

  if (!slug) {
    return (
      <MainContainer className={classes.root}>
        <MainHeader>
          <Title>
            <MenuBookIcon style={{ verticalAlign: "middle", marginRight: 8 }} />
            {isManaging ? "Gerenciar tutoriais" : `Tutoriais (${records.length})`}
          </Title>
          {canManage && (
            <MainHeaderButtonsWrapper>
              <Button
                variant="contained"
                color={isManaging ? "default" : "primary"}
                onClick={handleToggleManage}
              >
                {isManaging ? "Ver tutoriais" : "Gerenciar tutoriais"}
              </Button>
            </MainHeaderButtonsWrapper>
          )}
        </MainHeader>
        {isManaging && (
          <div className={classes.managerWrapper}>
            <HelpsManager
              onChange={refreshTutorials}
              initialRecordId={editingTutorialId}
              initialAreaKey={creatingAreaKey}
            />
          </div>
        )}
        {!isManaging && (
          <>
            {loading && (
              <div className={classes.loadingBox}>
                <CircularProgress />
              </div>
            )}
            {error && (
              <Paper className={classes.errorBox} elevation={1}>
                {error}
              </Paper>
            )}
            {!loading && !error && (
              <>
                <Paper className={classes.filtersPaper} elevation={1}>
                  <TextField
                    variant="outlined"
                    size="small"
                    placeholder={i18n.t("helps.tutorialFilters.search")}
                    value={searchParam}
                    onChange={(event) => setSearchParam(event.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    select
                    variant="outlined"
                    size="small"
                    label={i18n.t("helps.tutorialFilters.type")}
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                  >
                    <MenuItem value="all">{i18n.t("helps.tutorialFilters.allTypes")}</MenuItem>
                    <MenuItem value={TUTORIAL_TYPES.video}>{getTypeLabel(TUTORIAL_TYPES.video)}</MenuItem>
                    <MenuItem value={TUTORIAL_TYPES.markdown}>{getTypeLabel(TUTORIAL_TYPES.markdown)}</MenuItem>
                    <MenuItem value={TUTORIAL_TYPES.pdf}>PDF</MenuItem>
                  </TextField>
                  <TextField
                    select
                    variant="outlined"
                    size="small"
                    label={i18n.t("helps.tutorialFilters.area")}
                    value={areaFilter}
                    onChange={(event) => setAreaFilter(event.target.value)}
                  >
                    <MenuItem value="all">{i18n.t("helps.tutorialFilters.allAreas")}</MenuItem>
                    {areaOptions.map((area) => (
                      <MenuItem key={area} value={area}>
                        {getDisplayAreaLabel(area)}
                      </MenuItem>
                    ))}
                  </TextField>
                  {areaFilter !== "all" && (
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => {
                        setSearchParam("");
                        setTypeFilter("all");
                        setAreaFilter("all");
                        history.replace("/tutoriais");
                      }}
                    >
                      {i18n.t("helps.tutorialFilters.viewAll")}
                    </Button>
                  )}
                </Paper>

                {filteredRecords.length === 0 && (
                  <Paper className={classes.emptyState} elevation={1}>
                    <Typography variant="subtitle1">
                      Nenhum tutorial encontrado.
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Ajuste os filtros ou tente buscar por outro termo.
                    </Typography>
                    {canManage && (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleCreateTutorial}
                        style={{ marginTop: 16 }}
                      >
                        Criar tutorial
                      </Button>
                    )}
                  </Paper>
                )}

                {filteredRecords.length > 0 && (
                  <Paper className={classes.listPaper} elevation={0}>
                    {filteredRecords.map((t) => {
                      const tutorialType = getTutorialType(t);

                      return (
                        <Paper
                          key={t.id}
                          className={classes.card}
                          elevation={1}
                          onClick={() => handleOpenTutorial(t.id)}
                        >
                          {canManage && (
                            <IconButton
                              className={classes.editButton}
                              size="small"
                              onClick={(event) => handleEditTutorial(event, t.id)}
                              title="Editar tutorial"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )}
                          <div className={classes.cardHeader}>
                            <div className={classes.cardIcon}>
                              {getTypeIcon(tutorialType)}
                            </div>
                            <div className={classes.cardBody}>
                              <Typography className={classes.cardTitle} variant="h6">
                                {t.title}
                              </Typography>
                              <Typography
                                className={classes.cardDescription}
                                variant="body2"
                              >
                                {t.description || "Tutorial sem descrição cadastrada."}
                              </Typography>
                            </div>
                          </div>
                          <div className={classes.cardFooter}>
                            <Typography variant="caption" color="textSecondary">
                              Abrir tutorial
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {getTypeLabel(tutorialType)}
                            </Typography>
                          </div>
                        </Paper>
                      );
                    })}
                  </Paper>
                )}
              </>
            )}
          </>
        )}
      </MainContainer>
    );
  }

  const currentType = current ? getTutorialType(current) : null;
  const embedUrl = current ? toYoutubeEmbed(current.video) : null;

  return (
    <MainContainer className={classes.root}>
      <MainHeader>
        <Title>{current ? current.title : "Tutorial"}</Title>
        {canManage && current && (
          <MainHeaderButtonsWrapper>
            <Button
              variant="contained"
              color="primary"
              startIcon={<EditIcon />}
              onClick={(event) => handleEditTutorial(event, current.id)}
            >
              Editar
            </Button>
          </MainHeaderButtonsWrapper>
        )}
      </MainHeader>
      <div className={classes.docHeader}>
        <Button
          className={classes.backButton}
          startIcon={<ArrowBackIcon />}
          onClick={() => history.push("/tutoriais")}
        >
          Voltar aos tutoriais
        </Button>
        {current && (
          <div className={classes.docActions}>
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              icon={getTypeIcon(currentType)}
              label={getTypeLabel(currentType)}
            />
            {current.areaKey && (
              <Chip
                size="small"
                variant="outlined"
                label={`Ir para ${getDisplayAreaLabel(current.areaKey)}`}
                onClick={() => handleOpenArea(current.areaKey)}
                clickable={Boolean(AREA_ROUTES[current.areaKey])}
              />
            )}
          </div>
        )}
      </div>

      {loading && (
        <div className={classes.loadingBox}>
          <CircularProgress />
        </div>
      )}

      {!loading && !current && (
        <Paper className={classes.errorBox} elevation={1}>
          Tutorial não encontrado.
        </Paper>
      )}

      {!loading && current && (
        <div className={classes.docWrapper}>
          <Paper
            className={`${classes.docPaper} ${currentType === TUTORIAL_TYPES.pdf ? classes.pdfDocPaper : ""}`}
            elevation={currentType === TUTORIAL_TYPES.pdf ? 0 : 1}
          >
            {current.description && (
              <Typography variant="subtitle1" color="textSecondary" gutterBottom>
                {current.description}
              </Typography>
            )}

            {embedUrl && (
              <div className={classes.videoWrapper}>
                <iframe
                  title={current.title}
                  src={embedUrl}
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {current.content && <Markdown>{current.content}</Markdown>}

            {(current.attachments || []).map((att) =>
              att.type === "image" ? (
                <img
                  key={att.id}
                  className={classes.image}
                  src={`${backendUrl}/public/${att.path}`}
                  alt={att.name}
                />
              ) : att.type === "pdf" ? (
                <div key={att.id}>
                  <div
                    ref={pdfContainerRef}
                    className={classes.pdfViewer}
                  >
                    <Document
                      file={`${backendUrl}/public/${att.path}`}
                      onLoadSuccess={(pdf) => handlePdfLoadSuccess(att.id, pdf)}
                      loading={<CircularProgress />}
                    >
                      {Array.from(new Array(pdfPages[att.id] || 0), (_page, index) => (
                        <Page
                          key={`page_${index + 1}`}
                          pageNumber={index + 1}
                          width={pdfWidth}
                          renderAnnotationLayer={false}
                          renderTextLayer={false}
                        />
                      ))}
                    </Document>
                  </div>
                  <div className={classes.pdfActions}>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<PictureAsPdfIcon />}
                      component="a"
                      href={`${backendUrl}/public/${att.path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Abrir PDF em nova aba
                    </Button>
                  </div>
                </div>
              ) : (
                <div key={att.id} className={classes.attachment}>
                  <AttachFileIcon fontSize="small" />
                  <Link
                    href={`${backendUrl}/public/${att.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {att.name}
                  </Link>
                </div>
              )
            )}

            {!current.content &&
              !embedUrl &&
              (current.attachments || []).length === 0 && (
                <Typography variant="body2" color="textSecondary">
                  Este tutorial ainda não tem conteúdo.
                </Typography>
              )}
          </Paper>
        </div>
      )}
    </MainContainer>
  );
};

export default Tutoriais;
