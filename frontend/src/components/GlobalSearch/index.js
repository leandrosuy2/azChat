import React, { useEffect, useMemo, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import clsx from "clsx";
import {
  Box,
  CircularProgress,
  ClickAwayListener,
  InputBase,
  List,
  ListItem,
  ListItemText,
  makeStyles,
  Paper,
  Typography
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import SettingsIcon from "@material-ui/icons/Settings";
import DashboardIcon from "@material-ui/icons/Dashboard";
import ContactPhoneIcon from "@material-ui/icons/ContactPhone";
import ReceiptIcon from "@material-ui/icons/Receipt";
import StorefrontIcon from "@material-ui/icons/Storefront";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  root: {
    position: "relative",
    width: 360,
    maxWidth: "36vw",
    [theme.breakpoints.down("sm")]: {
      width: "100%",
      maxWidth: "100%",
      order: 3,
      flexBasis: "100%",
      marginTop: theme.spacing(1)
    }
  },
  inputWrap: {
    height: 38,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(0, 1.5),
    borderRadius: 10,
    background: theme.mode === "dark" ? "rgba(255,255,255,0.08)" : "#fff",
    border: theme.mode === "dark" ? "1px solid rgba(255,255,255,0.16)" : "1px solid #e5e9f2",
    boxShadow: theme.mode === "dark" ? "none" : "0 8px 24px rgba(16, 24, 40, 0.06)",
    color: theme.mode === "dark" ? "#fff" : "#111827"
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "inherit",
    "& input::placeholder": {
      color: theme.mode === "dark" ? "rgba(255,255,255,0.7)" : "#7b8496",
      opacity: 1
    }
  },
  dropdown: {
    position: "absolute",
    top: 46,
    left: 0,
    right: 0,
    zIndex: theme.zIndex.modal,
    overflow: "hidden",
    borderRadius: 12,
    border: theme.mode === "dark" ? "1px solid rgba(255,255,255,0.12)" : "1px solid #e7eaf3",
    boxShadow: "0 18px 50px rgba(15, 23, 42, 0.18)"
  },
  sectionTitle: {
    padding: theme.spacing(1, 1.5, 0.5),
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: theme.palette.text.secondary
  },
  item: {
    minHeight: 56,
    alignItems: "flex-start",
    gap: theme.spacing(1),
    borderLeft: "3px solid transparent",
    "&$activeItem": {
      background: theme.mode === "dark" ? "rgba(255,255,255,0.08)" : "#f4f0ff",
      borderLeftColor: theme.palette.primary.main
    }
  },
  activeItem: {},
  type: {
    display: "inline-flex",
    marginTop: 3,
    padding: "2px 7px",
    borderRadius: 999,
    background: theme.mode === "dark" ? "rgba(255,255,255,0.09)" : "#eef2ff",
    color: theme.palette.primary.main,
    fontSize: 11,
    fontWeight: 700
  },
  empty: {
    padding: theme.spacing(2),
    textAlign: "center"
  },
  iconBox: {
    width: 30,
    height: 30,
    marginTop: 3,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    background: theme.mode === "dark" ? "rgba(255,255,255,0.08)" : "#f4f0ff",
    color: theme.palette.primary.main,
    flex: "0 0 auto"
  }
}));

const moduleResults = [
  { id: "module-dashboard", type: "Modulo", group: "Modulos", title: "Painel operacional", description: "Indicadores, relatorios e painel ao vivo", path: "/", icon: DashboardIcon },
  { id: "module-tickets", type: "Modulo", group: "Modulos", title: "Atendimentos", description: "Conversas, filas e mensagens", path: "/tickets", icon: ContactPhoneIcon },
  { id: "module-contacts", type: "Modulo", group: "Modulos", title: "Contatos", description: "Clientes e contatos cadastrados", path: "/contacts", icon: ContactPhoneIcon },
  { id: "module-products", type: "Modulo", group: "Modulos", title: "Produtos", description: "Catalogo e precificacao", path: "/products", icon: StorefrontIcon },
  { id: "module-finance", type: "Modulo", group: "Modulos", title: "Financeiro", description: "Financeiro e indicadores comerciais", path: "/?hub=finance", icon: ReceiptIcon },
  { id: "module-settings", type: "Modulo", group: "Modulos", title: "Configuracoes", description: "Preferencias e administracao do sistema", path: "/settings", icon: SettingsIcon }
];

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const groupResults = (items) =>
  items.reduce((acc, item) => {
    const group = item.group || "Resultados";
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

const GlobalSearch = () => {
  const classes = useStyles();
  const history = useHistory();
  const [query, setQuery] = useState("");
  const [remoteResults, setRemoteResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const localResults = useMemo(() => {
    const term = normalize(query);
    if (term.length < 2) return [];
    return moduleResults.filter((item) =>
      normalize(`${item.title} ${item.type} ${item.description}`).includes(term)
    );
  }, [query]);

  const results = useMemo(
    () => [...localResults, ...remoteResults].slice(0, 24),
    [localResults, remoteResults]
  );

  const grouped = useMemo(() => groupResults(results), [results]);

  useEffect(() => {
    const term = query.trim();
    setActiveIndex(0);
    if (term.length < 2) {
      setRemoteResults([]);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/global-search", { params: { q: term } });
        if (!active) return;
        setRemoteResults(Array.isArray(data.results) ? data.results : []);
      } catch (err) {
        if (active) toastError(err);
      } finally {
        if (active) setLoading(false);
      }
    }, 260);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const goTo = (item) => {
    if (!item?.path) return;
    setOpen(false);
    setQuery("");
    history.push(item.path);
  };

  const handleKeyDown = (event) => {
    if (!open && ["ArrowDown", "Enter"].includes(event.key)) setOpen(true);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, Math.max(results.length - 1, 0)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }
    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      goTo(results[activeIndex]);
    }
    if (event.key === "Escape") {
      setOpen(false);
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  };

  const shouldShowDropdown = open && query.trim().length >= 2;
  let flatIndex = -1;

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box className={classes.root}>
        <Box className={classes.inputWrap}>
          <SearchIcon fontSize="small" />
          <InputBase
            inputRef={inputRef}
            className={classes.input}
            value={query}
            placeholder="Buscar no sistema..."
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            inputProps={{ "aria-label": "Buscar no sistema" }}
          />
          {loading && <CircularProgress size={16} color="inherit" />}
        </Box>

        {shouldShowDropdown && (
          <Paper className={classes.dropdown}>
            {results.length === 0 && !loading ? (
              <Box className={classes.empty}>
                <Typography variant="body2" color="textSecondary">
                  Nenhum resultado encontrado
                </Typography>
              </Box>
            ) : (
              <List dense disablePadding>
                {Object.entries(grouped).map(([group, items]) => (
                  <React.Fragment key={group}>
                    <Typography className={classes.sectionTitle}>{group}</Typography>
                    {items.map((item) => {
                      flatIndex += 1;
                      const Icon = item.icon || SearchIcon;
                      const selected = flatIndex === activeIndex;
                      return (
                        <ListItem
                          button
                          key={item.id}
                          className={clsx(classes.item, selected && classes.activeItem)}
                          onMouseEnter={() => setActiveIndex(flatIndex)}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => goTo(item)}
                        >
                          <Box className={classes.iconBox}>
                            <Icon fontSize="small" />
                          </Box>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gridGap={8}>
                                <Typography variant="body2" noWrap>
                                  {item.title}
                                </Typography>
                                <span className={classes.type}>{item.type}</span>
                              </Box>
                            }
                            secondary={item.description}
                            secondaryTypographyProps={{ noWrap: true }}
                          />
                        </ListItem>
                      );
                    })}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
};

export default GlobalSearch;
