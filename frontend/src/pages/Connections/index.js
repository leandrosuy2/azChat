
import React, { useState, useCallback, useContext, useEffect } from "react";
import { toast } from "react-toastify";
import { add, format, parseISO } from "date-fns";

import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import PopupState, { bindTrigger, bindMenu } from "material-ui-popup-state";
// import { SocketContext } from "../../context/Socket/SocketContext";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import {
  Button,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Table,
  TableHead,
  Paper,
  Tooltip,
  Typography,
  CircularProgress,
  Box,
  Card,
  CardContent,
} from "@material-ui/core";
import {
  Edit,
  CheckCircle,
  SignalCellularConnectedNoInternet2Bar,
  SignalCellularConnectedNoInternet0Bar,
  SignalCellular4Bar,
  CropFree,
  DeleteOutline,
  CloudDone,
  FileCopy,
  Facebook,
  Instagram,
  Sync,
  WhatsApp,
} from "@material-ui/icons";

import FacebookLogin from "react-facebook-login/dist/facebook-login-render-props";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import HelpHint from "../../components/HelpHint";
import TableRowSkeleton from "../../components/TableRowSkeleton";

import api from "../../services/api";
import WhatsAppModal from "../../components/WhatsAppModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import QrcodeModal from "../../components/QrcodeModal";
import { i18n } from "../../translate/i18n";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import toastError from "../../errors/toastError";
import formatSerializedId from '../../utils/formatSerializedId';
import { AuthContext } from "../../context/Auth/AuthContext";
import usePlans from "../../hooks/usePlans";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import ForbiddenPage from "../../components/ForbiddenPage";
import { Can } from "../../components/Can";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    // padding: theme.spacing(1),
    padding: theme.padding,
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  customTableCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  tooltip: {
    backgroundColor: "#f5f5f9",
    color: "rgba(0, 0, 0, 0.87)",
    fontSize: theme.typography.pxToRem(14),
    border: "1px solid #dadde9",
    maxWidth: 450,
  },
  tooltipPopper: {
    textAlign: "center",
  },
  buttonProgress: {
    color: green[500],
  },
}));

const facebookAppId = process.env.REACT_APP_FACEBOOK_APP_ID;
const facebookApiVersion = process.env.REACT_APP_FACEBOOK_API_VERSION || "25.0";
const instagramDirectAppId = process.env.REACT_APP_INSTAGRAM_APP_ID;
const instagramDirectRedirectUri =
  process.env.REACT_APP_INSTAGRAM_REDIRECT_URI || `${window.location.origin}/instagram/callback`;
const instagramDirectScope =
  process.env.REACT_APP_INSTAGRAM_SCOPE ||
  "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments";
const requireBusinessManagement =
  process.env.REACT_APP_REQUIRE_BUSINESS_MANAGEMENT?.toUpperCase() === "TRUE";
const facebookScope = requireBusinessManagement
  ? "public_profile,pages_messaging,pages_show_list,pages_manage_metadata,pages_read_engagement,business_management"
  : "public_profile,pages_messaging,pages_show_list,pages_manage_metadata,pages_read_engagement";
const instagramScope = requireBusinessManagement
  ? "public_profile,instagram_basic,instagram_manage_messages,pages_messaging,pages_show_list,pages_manage_metadata,pages_read_engagement,business_management"
  : "public_profile,instagram_basic,instagram_manage_messages,pages_messaging,pages_show_list,pages_manage_metadata,pages_read_engagement";

function CircularProgressWithLabel(props) {
  return (
    <Box position="relative" display="inline-flex">
      <CircularProgress variant="determinate" {...props} />
      <Box
        top={0}
        left={0}
        bottom={0}
        right={0}
        position="absolute"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Typography
          variant="caption"
          component="div"
          color="textSecondary"
        >{`${Math.round(props.value)}%`}</Typography>
      </Box>
    </Box>
  );
}

const CustomToolTip = ({ title, content, children }) => {
  const classes = useStyles();

  return (
    <Tooltip
      arrow
      classes={{
        tooltip: classes.tooltip,
        popper: classes.tooltipPopper,
      }}
      title={
        <React.Fragment>
          <Typography gutterBottom color="inherit">
            {title}
          </Typography>
          {content && <Typography>{content}</Typography>}
        </React.Fragment>
      }
    >
      {children}
    </Tooltip>
  );
};

const IconChannel = (channel) => {
  switch (channel) {
    case "facebook":
      return <Facebook style={{ color: "#3b5998" }} />;
    case "instagram":
      return <Instagram style={{ color: "#e1306c" }} />;
    case "whatsapp":
      return <WhatsApp style={{ color: "#25d366" }} />;
    default:
      return "error";
  }
};

const Connections = () => {
  const classes = useStyles();

  const { whatsApps, loading } = useContext(WhatsAppsContext);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [statusImport, setStatusImport] = useState([]);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedWhatsApp, setSelectedWhatsApp] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const history = useHistory();
  const confirmationModalInitialState = {
    action: "",
    title: "",
    message: "",
    whatsAppId: "",
    open: false,
  };
  const [confirmModalInfo, setConfirmModalInfo] = useState(confirmationModalInitialState);
  const [planConfig, setPlanConfig] = useState(false);
  const [syncingInstagramId, setSyncingInstagramId] = useState(null);

  //   const socketManager = useContext(SocketContext);
  const { user, socket } = useContext(AuthContext);

  const companyId = user.companyId;

  const { getPlanCompany } = usePlans();

  useEffect(() => {
    async function fetchData() {
      const planConfigs = await getPlanCompany(undefined, companyId);
      setPlanConfig(planConfigs)
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const responseFacebook = (response) => {
    if (!facebookAppId) {
      toast.error("Configure REACT_APP_FACEBOOK_APP_ID no frontend dev.");
      return;
    }

    if (response.status !== "unknown") {
      const { accessToken, id } = response;

      api
        .post("/facebook", {
          facebookUserId: id,
          facebookUserToken: accessToken,
        })
        .then((response) => {
          toast.success(i18n.t("connections.facebook.success"));
        })
        .catch((error) => {
          toastError(error);
        });
    }
  };

  const responseInstagram = (response) => {
    if (!facebookAppId) {
      toast.error("Configure REACT_APP_FACEBOOK_APP_ID no frontend dev.");
      return;
    }

    if (response.status !== "unknown") {
      const { accessToken, id } = response;

      api
        .post("/facebook", {
          addInstagram: true,
          facebookUserId: id,
          facebookUserToken: accessToken,
        })
        .then((response) => {
          toast.success(i18n.t("connections.facebook.success"));
        })
        .catch((error) => {
          toastError(error);
        });
    }
  };

  const handleInstagramDirectLogin = () => {
    if (!instagramDirectAppId) {
      toast.error("Configure REACT_APP_INSTAGRAM_APP_ID no frontend.");
      return;
    }

    const state = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("instagramDirectOAuthState", state);

    const params = new URLSearchParams({
      client_id: instagramDirectAppId,
      redirect_uri: instagramDirectRedirectUri,
      response_type: "code",
      scope: instagramDirectScope,
      state,
      force_authentication: "1",
      enable_fb_login: "0"
    });

    window.open(
      `https://www.instagram.com/oauth/authorize?${params.toString()}`,
      "instagram-direct-login",
      "width=720,height=760,menubar=no,toolbar=no,status=no"
    );
  };

  useEffect(() => {
    // const socket = socketManager.GetSocket();
    socket.on(`importMessages-${user.companyId}`, (data) => {
      if (data.action === "refresh") {
        setStatusImport([]);
        history.go(0);
      }
      if (data.action === "update") {
        setStatusImport(data.status);
      }
    });

    const onInstagramSync = (data) => {
      if (data.status === "done") {
        setSyncingInstagramId(null);
        toast.success(
          `Instagram sincronizado: ${data.messages || 0} mensagens em ${data.conversations || 0} conversa(s).`
        );
      } else if (data.status === "error") {
        setSyncingInstagramId(null);
        toast.error(`Falha ao sincronizar Instagram: ${data.message || "erro desconhecido"}`);
      }
    };
    const onInstagramOAuth = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "instagram-oauth") return;

      const expectedState = localStorage.getItem("instagramDirectOAuthState");
      localStorage.removeItem("instagramDirectOAuthState");

      if (event.data.error) {
        toast.error(event.data.errorDescription || "Login do Instagram cancelado.");
        return;
      }

      if (!event.data.code || event.data.state !== expectedState) {
        toast.error("Retorno do Instagram inválido. Tente conectar novamente.");
        return;
      }

      api
        .post("/instagram/direct-login", {
          code: event.data.code,
          redirectUri: instagramDirectRedirectUri
        })
        .then(() => {
          toast.success("Instagram conectado com login direto.");
        })
        .catch((error) => {
          toastError(error);
        });
    };

    socket.on(`company-${user.companyId}-instagramSync`, onInstagramSync);
    window.addEventListener("message", onInstagramOAuth);

    return () => {
      socket.off(`company-${user.companyId}-instagramSync`, onInstagramSync);
      window.removeEventListener("message", onInstagramOAuth);
    };
  }, [whatsApps]);

  const handleStartWhatsAppSession = async (whatsAppId) => {
    try {
      await api.post(`/whatsappsession/${whatsAppId}`);
    } catch (err) {
      toastError(err);
    }
  };

  const handleRequestNewQrCode = async (whatsAppId) => {
    try {
      await api.put(`/whatsappsession/${whatsAppId}`);
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenWhatsAppModal = () => {
    setSelectedWhatsApp(null);
    setWhatsAppModalOpen(true);
  };

  const handleCloseWhatsAppModal = useCallback(() => {
    setWhatsAppModalOpen(false);
    setSelectedWhatsApp(null);
  }, [setSelectedWhatsApp, setWhatsAppModalOpen]);

  const handleOpenQrModal = (whatsApp) => {
    setSelectedWhatsApp(whatsApp);
    setQrModalOpen(true);
  };

  const handleCloseQrModal = useCallback(() => {
    setSelectedWhatsApp(null);
    setQrModalOpen(false);
  }, [setQrModalOpen, setSelectedWhatsApp]);

  const handleEditWhatsApp = (whatsApp) => {
    setSelectedWhatsApp(whatsApp);
    setWhatsAppModalOpen(true);
  };

  const openInNewTab = url => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenConfirmationModal = (action, whatsAppId) => {
    if (action === "disconnect") {
      setConfirmModalInfo({
        action: action,
        title: i18n.t("connections.confirmationModal.disconnectTitle"),
        message: i18n.t("connections.confirmationModal.disconnectMessage"),
        whatsAppId: whatsAppId,
      });
    }

    if (action === "delete") {
      setConfirmModalInfo({
        action: action,
        title: i18n.t("connections.confirmationModal.deleteTitle"),
        message: i18n.t("connections.confirmationModal.deleteMessage"),
        whatsAppId: whatsAppId,
      });
    }
    if (action === "closedImported") {
      setConfirmModalInfo({
        action: action,
        title: i18n.t("connections.confirmationModal.closedImportedTitle"),
        message: i18n.t("connections.confirmationModal.closedImportedMessage"),
        whatsAppId: whatsAppId,
      });
    }
    setConfirmModalOpen(true);
  };

  const handleSubmitConfirmationModal = async () => {
    if (confirmModalInfo.action === "disconnect") {
      try {
        await api.delete(`/whatsappsession/${confirmModalInfo.whatsAppId}`);
      } catch (err) {
        toastError(err);
      }
    }

    if (confirmModalInfo.action === "delete") {
      try {
        await api.delete(`/whatsapp/${confirmModalInfo.whatsAppId}`);
        toast.success(i18n.t("connections.toasts.deleted"));
      } catch (err) {
        toastError(err);
      }
    }
    if (confirmModalInfo.action === "closedImported") {
      try {
        await api.post(`/closedimported/${confirmModalInfo.whatsAppId}`);
        toast.success(i18n.t("connections.toasts.closedimported"));
      } catch (err) {
        toastError(err);
      }
    }

    setConfirmModalInfo(confirmationModalInitialState);
  };


  const renderImportButton = (whatsApp) => {
    if (whatsApp?.statusImportMessages === "renderButtonCloseTickets") {
      return (
        <Button
          style={{ marginLeft: 12 }}
          size="small"
          variant="outlined"
          color="primary"
          onClick={() => {
            handleOpenConfirmationModal("closedImported", whatsApp.id);
          }}
        >
          {i18n.t("connections.buttons.closedImported")}
        </Button>
      );
    }

    if (whatsApp?.importOldMessages) {
      let isTimeStamp = !isNaN(
        new Date(Math.floor(whatsApp?.statusImportMessages)).getTime()
      );

      if (isTimeStamp) {
        const ultimoStatus = new Date(
          Math.floor(whatsApp?.statusImportMessages)
        ).getTime();
        const dataLimite = +add(ultimoStatus, { seconds: +35 }).getTime();
        if (dataLimite > new Date().getTime()) {
          return (
            <>
              <Button
                disabled
                style={{ marginLeft: 12 }}
                size="small"
                endIcon={
                  <CircularProgress
                    size={12}
                    className={classes.buttonProgress}
                  />
                }
                variant="outlined"
                color="primary"
              >
                {i18n.t("connections.buttons.preparing")}
              </Button>
            </>
          );
        }
      }
    }
  };

  const renderActionButtons = (whatsApp) => {
    return (
      <>
        {whatsApp.status === "qrcode" && (
          <Can
            role={user.profile === "user" && user.allowConnections === "enabled" ? "admin" : user.profile}
            perform="connections-page:addConnection"
            yes={() => (
              <Button
                size="small"
                variant="contained"
                color="primary"
                onClick={() => handleOpenQrModal(whatsApp)}
              >
                {i18n.t("connections.buttons.qrcode")}
              </Button>
            )}
          />
        )}
        {whatsApp.status === "DISCONNECTED" && (
          <Can
            role={user.profile === "user" && user.allowConnections === "enabled" ? "admin" : user.profile}
            perform="connections-page:addConnection"
            yes={() => (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={() => handleStartWhatsAppSession(whatsApp.id)}
                >
                  {i18n.t("connections.buttons.tryAgain")}
                </Button>{" "}
                <Button
                  size="small"
                  variant="outlined"
                  color="secondary"
                  onClick={() => handleRequestNewQrCode(whatsApp.id)}
                >
                  {i18n.t("connections.buttons.newQr")}
                </Button>
              </>
            )}
          />
        )}
        {(whatsApp.status === "CONNECTED" ||
          whatsApp.status === "PAIRING" ||
          whatsApp.status === "TIMEOUT") && (
            <Can
              role={user.profile}
              perform="connections-page:addConnection"
              yes={() => (
                <>
                  <Button
                    size="small"
                    variant="outlined"
                    color="secondary"
                    onClick={() => {
                      handleOpenConfirmationModal("disconnect", whatsApp.id);
                    }}
                  >
                    {i18n.t("connections.buttons.disconnect")}
                  </Button>

                  {renderImportButton(whatsApp)}
                </>
              )}
            />
          )}
        {whatsApp.status === "OPENING" && (
          <Button size="small" variant="outlined" disabled color="default">
            {i18n.t("connections.buttons.connecting")}
          </Button>
        )}
      </>
    );
  };

  const renderStatusToolTips = (whatsApp) => {
    return (
      <div className={classes.customTableCell}>
        {whatsApp.status === "DISCONNECTED" && (
          <CustomToolTip
            title={i18n.t("connections.toolTips.disconnected.title")}
            content={whatsApp.metaConnectionError || i18n.t("connections.toolTips.disconnected.content")}
          >
            <SignalCellularConnectedNoInternet0Bar color="secondary" />
          </CustomToolTip>
        )}
        {whatsApp.status === "OPENING" && (
          <CircularProgress size={24} className={classes.buttonProgress} />
        )}
        {whatsApp.status === "qrcode" && (
          <CustomToolTip
            title={i18n.t("connections.toolTips.qrcode.title")}
            content={i18n.t("connections.toolTips.qrcode.content")}
          >
            <CropFree />
          </CustomToolTip>
        )}
        {whatsApp.status === "CONNECTED" && (
          <CustomToolTip title={i18n.t("connections.toolTips.connected.title")}>
            <SignalCellular4Bar style={{ color: green[500] }} />
          </CustomToolTip>
        )}
        {(whatsApp.status === "TIMEOUT" || whatsApp.status === "PAIRING") && (
          <CustomToolTip
            title={i18n.t("connections.toolTips.timeout.title")}
            content={i18n.t("connections.toolTips.timeout.content")}
          >
            <SignalCellularConnectedNoInternet2Bar color="secondary" />
          </CustomToolTip>
        )}
      </div>
    );
  };

  const restartWhatsapps = async () => {

    try {
      await api.post(`/whatsapp-restart/`);
      toast.success(i18n.t("connections.waitConnection"));
    } catch (err) {
      toastError(err);
    }
  }

  const handleSyncInstagramDms = async (whatsAppId) => {
    try {
      setSyncingInstagramId(whatsAppId);
      await api.post(`/instagram/${whatsAppId}/sync-dms`);
      toast.info("Sincronização iniciada. Pode continuar usando a plataforma — vamos avisar quando terminar.");
    } catch (err) {
      setSyncingInstagramId(null);
      toastError(err);
    }
  };

  const handleCopyWebhookUrl = async (whatsApp) => {
    const url = whatsApp.webhookUrl;
    if (!url) {
      toast.error("URL de webhook não disponível para esta conexão.");
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL do webhook copiada.");
    } catch (err) {
      toast.error(url);
    }
  };

  const handleCopyVerifyToken = async (whatsApp) => {
    const token = whatsApp.metaVerifyToken;
    if (!token) {
      toast.error("Verify Token não disponível para esta conexão.");
      return;
    }

    try {
      await navigator.clipboard.writeText(token);
      toast.success("Verify Token copiado.");
    } catch (err) {
      toast.error(token);
    }
  };

  const handleTestMetaConnection = async (whatsAppId) => {
    try {
      const { data } = await api.post(`/whatsapp/${whatsAppId}/test-meta`);
      toast.success(`Conexão Meta validada: ${data.status}`);
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={confirmModalInfo.title}
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={handleSubmitConfirmationModal}
      >
        {confirmModalInfo.message}
      </ConfirmationModal>
      {qrModalOpen && (
        <QrcodeModal
          open={qrModalOpen}
          onClose={handleCloseQrModal}
          whatsAppId={!whatsAppModalOpen && selectedWhatsApp?.id}
        />
      )}
      <WhatsAppModal
        open={whatsAppModalOpen}
        onClose={handleCloseWhatsAppModal}
        whatsAppId={!qrModalOpen && selectedWhatsApp?.id}
      />
      {user.profile === "user" && user.allowConnections === "disabled" ?
        <ForbiddenPage />
        :
        <>
          <MainHeader>
            <span style={{ display: "flex", alignItems: "center" }}>
              <Title>{i18n.t("connections.title")} ({whatsApps.length})</Title>
              <HelpHint areaKey="connections" />
            </span>
            <MainHeaderButtonsWrapper>
              <Button
                variant="contained"
                color="primary"
                onClick={restartWhatsapps}
              >
                {i18n.t("connections.restartConnections")}
              </Button>

              <Button
                variant="contained"
                color="primary"
                onClick={() => openInNewTab(`https://wa.me/${process.env.REACT_APP_NUMBER_SUPPORT}`)}
              >
                {i18n.t("connections.callSupport")}
              </Button>
              <PopupState variant="popover" popupId="demo-popup-menu">
                {(popupState) => (
                  <React.Fragment>
                    <Can
                      role={user.profile}
                      perform="connections-page:addConnection"
                      yes={() => (
                        <>
                          <Button
                            variant="contained"
                            color="primary"
                            {...bindTrigger(popupState)}
                          >
                            {i18n.t("connections.newConnection")}
                          </Button>
                          <Menu {...bindMenu(popupState)}>
                            {/* WHATSAPP */}
                            <MenuItem
                              disabled={planConfig?.plan?.useWhatsapp ? false : true}
                              onClick={() => {
                                handleOpenWhatsAppModal();
                                popupState.close();
                              }}
                            >
                              <WhatsApp
                                fontSize="small"
                                style={{
                                  marginRight: "10px",
                                  color: "#25D366",
                                }}
                              />
                              WhatsApp
                            </MenuItem>
                            {/* FACEBOOK */}
                            <FacebookLogin
                              appId={facebookAppId}
                              autoLoad={false}
                              fields="name,email,picture"
                              version={facebookApiVersion}
                              scope={facebookScope}
                              callback={responseFacebook}
                              render={(renderProps) => (
                                <MenuItem
                                  disabled={planConfig?.plan?.useFacebook ? false : true}
                                  onClick={renderProps.onClick}
                                >
                                  <Facebook
                                    fontSize="small"
                                    style={{
                                      marginRight: "10px",
                                      color: "#3b5998",
                                    }}
                                  />
                                  Facebook
                                </MenuItem>
                              )}
                            />
                            {/* INSTAGRAM */}
                            <FacebookLogin
                              appId={facebookAppId}
                              autoLoad={false}
                              fields="name,email,picture"
                              version={facebookApiVersion}
                              scope={instagramScope}
                              callback={responseInstagram}
                              render={(renderProps) => (
                                <MenuItem
                                  disabled={planConfig?.plan?.useInstagram ? false : true}
                                  onClick={renderProps.onClick}
                                >
                                  <Instagram
                                    fontSize="small"
                                    style={{
                                      marginRight: "10px",
                                      color: "#e1306c",
                                    }}
                                  />
                                  Instagram
                                </MenuItem>
                              )}
                            />
                            <MenuItem
                              disabled={planConfig?.plan?.useInstagram ? false : true}
                              onClick={() => {
                                handleInstagramDirectLogin();
                                popupState.close();
                              }}
                            >
                              <Instagram
                                fontSize="small"
                                style={{
                                  marginRight: "10px",
                                  color: "#e1306c",
                                }}
                              />
                              Instagram direto
                            </MenuItem>
                          </Menu>
                        </>
                      )}
                    />
                  </React.Fragment>
                )}
              </PopupState>
            </MainHeaderButtonsWrapper>
          </MainHeader>

          {
            statusImport?.all ? (
              <>
                <div style={{ margin: "auto", marginBottom: 12 }}>
                  <Card className={classes.root}>
                    <CardContent className={classes.content}>
                      <Typography component="h5" variant="h5">

                        {statusImport?.this === -1 ? i18n.t("connections.buttons.preparing") : i18n.t("connections.buttons.importing")}

                      </Typography>
                      {statusImport?.this === -1 ?
                        <Typography component="h6" variant="h6" align="center">

                          <CircularProgress
                            size={24}
                          />

                        </Typography>
                        :
                        <>
                          <Typography component="h6" variant="h6" align="center">
                            {`${i18n.t(`connections.typography.processed`)} ${statusImport?.this} ${i18n.t(`connections.typography.in`)} ${statusImport?.all}  ${i18n.t(`connections.typography.date`)}: ${statusImport?.date} `}
                          </Typography>
                          <Typography align="center">
                            <CircularProgressWithLabel
                              style={{ margin: "auto" }}
                              value={(statusImport?.this / statusImport?.all) * 100}
                            />
                          </Typography>
                        </>
                      }
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : null
          }

          <Paper className={classes.mainPaper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center">Channel</TableCell>
                  <TableCell align="center">{i18n.t("connections.table.name")}</TableCell>
                  <TableCell align="center">{i18n.t("connections.table.number")}</TableCell>
                  <TableCell align="center">{i18n.t("connections.table.status")}</TableCell>
                  <TableCell align="center">{i18n.t("connections.table.session")}</TableCell>
                  <TableCell align="center">{i18n.t("connections.table.lastUpdate")}</TableCell>
                  <TableCell align="center">{i18n.t("connections.table.default")}</TableCell>
                  <Can
                    role={user.profile === "user" && user.allowConnections === "enabled" ? "admin" : user.profile}
                    perform="connections-page:addConnection"
                    yes={() => (
                      <TableCell align="center">{i18n.t("connections.table.actions")}</TableCell>
                    )}
                  />
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRowSkeleton />
                ) : (
                  <>
                    {whatsApps?.length > 0 &&
                      whatsApps.map((whatsApp) => (
                        <TableRow key={whatsApp.id}>
                          <TableCell align="center">{IconChannel(whatsApp.channel)}</TableCell>
                          <TableCell align="center">{whatsApp.name}</TableCell>
                          <TableCell align="center">{whatsApp.number && whatsApp.channel === 'whatsapp' ? (<>{formatSerializedId(whatsApp.number)}</>) : whatsApp.number}</TableCell>
                          <TableCell align="center">{renderStatusToolTips(whatsApp)}</TableCell>
                          <TableCell align="center">{renderActionButtons(whatsApp)}</TableCell>
                          <TableCell align="center">{format(parseISO(whatsApp.updatedAt), "dd/MM/yy HH:mm")}</TableCell>
                          <TableCell align="center">
                            {whatsApp.isDefault && (
                              <div className={classes.customTableCell}>
                                <CheckCircle style={{ color: green[500] }} />
                              </div>
                            )}
                          </TableCell>
                          <Can
                            role={user.profile}
                            perform="connections-page:addConnection"
                            yes={() => (
                              <TableCell align="center">
                                {["facebook", "instagram"].includes(whatsApp.channel) && (
                                  <>
                                    <Tooltip title="Testar conexão Meta" arrow>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleTestMetaConnection(whatsApp.id)}
                                      >
                                        <CloudDone />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Copiar URL do webhook" arrow>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleCopyWebhookUrl(whatsApp)}
                                      >
                                        <FileCopy />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Copiar Verify Token" arrow>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleCopyVerifyToken(whatsApp)}
                                      >
                                        <FileCopy />
                                      </IconButton>
                                    </Tooltip>
                                  </>
                                )}

                                {whatsApp.channel === "instagram" && (
                                  <Tooltip
                                    title="Sincronizar DMs do Instagram (importa conversas e mensagens recentes da API)"
                                    arrow
                                  >
                                    <span>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        color="primary"
                                        disabled={syncingInstagramId === whatsApp.id}
                                        onClick={() => handleSyncInstagramDms(whatsApp.id)}
                                        startIcon={
                                          syncingInstagramId === whatsApp.id ? (
                                            <CircularProgress size={14} style={{ color: "#fff" }} />
                                          ) : (
                                            <Sync />
                                          )
                                        }
                                        style={{ marginRight: 8, textTransform: "none" }}
                                      >
                                        {syncingInstagramId === whatsApp.id ? "Sincronizando..." : "Sincronizar DMs"}
                                      </Button>
                                    </span>
                                  </Tooltip>
                                )}

                                <IconButton
                                  size="small"
                                  onClick={() => handleEditWhatsApp(whatsApp)}
                                >
                                  <Edit />
                                </IconButton>

                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    handleOpenConfirmationModal("delete", whatsApp.id);
                                  }}
                                >
                                  <DeleteOutline />
                                </IconButton>
                              </TableCell>
                            )}
                          />
                        </TableRow>
                      ))}
                  </>
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      }
    </MainContainer >

  );
};

export default Connections;
