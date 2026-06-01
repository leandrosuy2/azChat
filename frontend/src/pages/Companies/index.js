import React, {
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";
import { toast } from "react-toastify";
import { useHistory, useLocation } from "react-router-dom";

import { makeStyles, alpha } from "@material-ui/core/styles";
import Avatar from "@material-ui/core/Avatar";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Chip from "@material-ui/core/Chip";
import IconButton from "@material-ui/core/IconButton";
import InputAdornment from "@material-ui/core/InputAdornment";
import Paper from "@material-ui/core/Paper";
import TextField from "@material-ui/core/TextField";
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";

import AddIcon from "@material-ui/icons/Add";
import BusinessIcon from "@material-ui/icons/Business";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditOutlinedIcon from "@material-ui/icons/EditOutlined";
import LaunchOutlinedIcon from "@material-ui/icons/LaunchOutlined";
import PeopleOutlineIcon from "@material-ui/icons/PeopleOutline";
import SearchIcon from "@material-ui/icons/Search";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import HelpHint from "../../components/HelpHint";
import ConfirmationModal from "../../components/ConfirmationModal";
import CompanyModal from "../../components/CompaniesModal";

import { AuthContext } from "../../context/Auth/AuthContext";

const reducer = (state, action) => {
  if (action.type === "LOAD_COMPANIES") {
    const companies = action.payload || [];
    const newCompanies = [];
    companies.forEach((company) => {
      const idx = state.findIndex((c) => c.id === company.id);
      if (idx !== -1) {
        state[idx] = company;
      } else {
        newCompanies.push(company);
      }
    });
    return [...state, ...newCompanies];
  }

  if (action.type === "UPDATE_COMPANY") {
    const company = action.payload;
    const idx = state.findIndex((c) => c.id === company.id);
    if (idx !== -1) {
      state[idx] = company;
      return [...state];
    }
    return [company, ...state];
  }

  if (action.type === "DELETE_COMPANY") {
    return state.filter((c) => c.id !== action.payload);
  }

  if (action.type === "RESET") {
    return [];
  }

  return state;
};

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    flex: 1,
  },
  headerWrap: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.5),
  },
  subtitle: {
    color: theme.palette.text.secondary,
  },
  filtersBar: {
    flexShrink: 0,
    padding: theme.spacing(1, 1.5),
    marginBottom: theme.spacing(1),
    borderRadius: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexWrap: "wrap",
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.grey[900]
        : theme.palette.grey[50],
  },
  searchField: {
    flex: "1 1 280px",
    minWidth: 220,
  },
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1.5),
    overflowY: "auto",
    borderRadius: theme.spacing(1),
    ...theme.scrollbarStyles,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
  },
  item: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(1.25, 1.5),
    borderRadius: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
    gap: theme.spacing(1.5),
    transition: "background-color .15s, transform .15s, border-color .15s",
    cursor: "default",
    "&:hover": {
      backgroundColor:
        theme.palette.type === "dark"
          ? alpha(theme.palette.common.white, 0.04)
          : alpha(theme.palette.primary.main, 0.04),
      borderColor:
        theme.palette.type === "dark"
          ? alpha(theme.palette.common.white, 0.12)
          : alpha(theme.palette.primary.main, 0.32),
      "& $actions": {
        opacity: 1,
      },
    },
  },
  avatar: {
    width: 40,
    height: 40,
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    color: theme.palette.primary.main,
    fontSize: "0.95rem",
    fontWeight: 600,
  },
  body: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    flex: 1,
    gap: 2,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    minWidth: 0,
  },
  companyName: {
    fontWeight: 600,
    fontSize: "0.95rem",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    color: theme.palette.text.secondary,
    fontSize: "0.8rem",
  },
  metaChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: "0.78rem",
  },
  statusActive: {
    backgroundColor: alpha(theme.palette.success.main, 0.14),
    color: theme.palette.success.main,
    borderColor: "transparent",
    fontWeight: 600,
  },
  statusInactive: {
    backgroundColor:
      theme.palette.type === "dark"
        ? alpha(theme.palette.common.white, 0.08)
        : alpha(theme.palette.common.black, 0.08),
    color: theme.palette.text.secondary,
    borderColor: "transparent",
    fontWeight: 600,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    opacity: 0.35,
    transition: "opacity .15s",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(6, 2),
    color: theme.palette.text.secondary,
    gap: theme.spacing(1),
  },
  footerHint: {
    padding: theme.spacing(1),
    textAlign: "center",
    color: theme.palette.text.hint,
    fontSize: "0.8rem",
  },
}));

const Companies = () => {
  const classes = useStyles();
  const history = useHistory();
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [companies, dispatch] = useReducer(reducer, []);

  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState(null);

  useEffect(() => {
    if (!user?.super) {
      toast.error(i18n.t("compaies.forbidden"));
      const t = setTimeout(() => history.push("/"), 800);
      return () => clearTimeout(t);
    }
  }, [user, history]);

  useEffect(() => {
    if (!user?.super) return;
    const params = new URLSearchParams(location.search);
    const raw = params.get("companyId");
    if (!raw) return;
    const id = parseInt(raw, 10);
    if (!Number.isFinite(id)) return;
    setSelectedCompanyId(id);
    setCompanyModalOpen(true);
  }, [location.search, user]);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  const fetchCompanies = useCallback(async () => {
    try {
      const { data } = await api.get("/companiesPlan", {
        params: { searchParam, pageNumber },
      });
      dispatch({ type: "LOAD_COMPANIES", payload: data.companies });
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  }, [searchParam, pageNumber]);

  useEffect(() => {
    if (!user?.super) return undefined;
    setLoading(true);
    const t = setTimeout(fetchCompanies, 400);
    return () => clearTimeout(t);
  }, [fetchCompanies, user]);

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenCreate = () => {
    setSelectedCompanyId(null);
    setCompanyModalOpen(true);
    if (location.pathname === "/companies" && location.search) {
      history.replace("/companies");
    }
  };

  const handleOpenEdit = (company) => {
    setSelectedCompanyId(company.id);
    setCompanyModalOpen(true);
    history.replace(`/companies?companyId=${company.id}`);
  };

  const handleCloseModal = () => {
    setSelectedCompanyId(null);
    setCompanyModalOpen(false);
    if (location.pathname === "/companies" && location.search) {
      history.replace("/companies");
    }
  };

  const handleSavedCompany = (company) => {
    if (company && company.id) {
      dispatch({ type: "UPDATE_COMPANY", payload: company });
    } else {
      dispatch({ type: "RESET" });
      setPageNumber(1);
      fetchCompanies();
    }
  };

  const handleAskDelete = (company) => {
    setDeletingCompany(company);
    setConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCompany) return;
    try {
      await api.delete(`/companies/${deletingCompany.id}`);
      dispatch({ type: "DELETE_COMPANY", payload: deletingCompany.id });
      toast.success(i18n.t("compaies.toasts.deleted"));
    } catch (err) {
      toastError(err);
    } finally {
      setDeletingCompany(null);
      setConfirmModalOpen(false);
    }
  };

  const handleGoToCompany = (company) => {
    if (!company?.id) return;
    handleOpenEdit(company);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      setPageNumber((p) => p + 1);
    }
  };

  const getInitials = (name) => {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <MainContainer className={classes.mainContainer}>
      <ConfirmationModal
        title={
          deletingCompany
            ? `${i18n.t("compaies.confirmationModal.deleteTitle")} ${
                deletingCompany.name
              }?`
            : ""
        }
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmDelete}
      >
        {i18n.t("compaies.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      {companyModalOpen && (
        <CompanyModal
          open={companyModalOpen}
          onClose={handleCloseModal}
          companyId={selectedCompanyId}
          onSaved={handleSavedCompany}
        />
      )}

      <MainHeader>
        <Box className={classes.headerWrap} flex={1} minWidth={0}>
          <span style={{ display: "flex", alignItems: "center" }}>
            <Title>
              {i18n.t("compaies.title")} ({companies.length})
            </Title>
            <HelpHint areaKey="companies" />
          </span>
          <Typography variant="body2" className={classes.subtitle}>
            {i18n.t("compaies.subtitle")}
          </Typography>
        </Box>
        <MainHeaderButtonsWrapper>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
          >
            {i18n.t("compaies.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      <Paper className={classes.filtersBar} variant="outlined" elevation={0}>
        <TextField
          className={classes.searchField}
          placeholder={i18n.t("compaies.searchPlaceholder")}
          type="search"
          variant="outlined"
          size="small"
          value={searchParam}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" style={{ color: "#888" }} />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <Paper
        className={classes.mainPaper}
        variant="outlined"
        onScroll={handleScroll}
      >
        {companies.length === 0 && !loading && (
          <Box className={classes.emptyState}>
            <BusinessIcon style={{ fontSize: 40, opacity: 0.35 }} />
            <Typography variant="body2">
              {i18n.t("compaies.emptyState")}
            </Typography>
          </Box>
        )}

        <Box className={classes.list}>
          {companies.map((company) => {
            const active = company.status !== false;
            const planName = company?.plan?.name;
            const userCount = Number(company?.userCount) || 0;
            const logoSrc = company?.logoUrl || null;
            return (
              <Box
                key={company.id}
                className={classes.item}
                onDoubleClick={() => handleOpenEdit(company)}
              >
                <Avatar className={classes.avatar} src={logoSrc || undefined}>
                  {logoSrc ? null : getInitials(company.name)}
                </Avatar>

                <Box className={classes.body}>
                  <Box className={classes.titleRow}>
                    <Typography className={classes.companyName} title={company.name}>
                      {company.name || i18n.t("compaies.unnamed")}
                    </Typography>
                    <Chip
                      size="small"
                      label={
                        active
                          ? i18n.t("compaies.statusActive")
                          : i18n.t("compaies.statusInactive")
                      }
                      className={
                        active ? classes.statusActive : classes.statusInactive
                      }
                    />
                  </Box>
                  <Box className={classes.metaRow}>
                    <span className={classes.metaChip}>
                      <PeopleOutlineIcon
                        style={{ fontSize: 14, opacity: 0.7 }}
                      />
                      {i18n.t("compaies.userCount", {
                        count: userCount,
                      })}
                    </span>
                    {planName && (
                      <>
                        <span>·</span>
                        <span>{planName}</span>
                      </>
                    )}
                  </Box>
                </Box>

                <Box className={classes.actions}>
                  <Tooltip title={i18n.t("compaies.actions.edit")}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEdit(company)}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={i18n.t("compaies.actions.open")}>
                    <IconButton
                      size="small"
                      onClick={() => handleGoToCompany(company)}
                    >
                      <LaunchOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={i18n.t("compaies.actions.delete")}>
                    <IconButton
                      size="small"
                      onClick={() => handleAskDelete(company)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            );
          })}
        </Box>

        {loading && (
          <Box className={classes.footerHint}>
            <CircularProgress size={16} style={{ marginRight: 8 }} />
            {i18n.t("compaies.loading")}
          </Box>
        )}
        {!loading && hasMore && (
          <Box className={classes.footerHint}>
            {i18n.t("compaies.scrollHint")}
          </Box>
        )}
      </Paper>
    </MainContainer>
  );
};

export default Companies;
