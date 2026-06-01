import React, { useState, useEffect, useContext } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Button, TextField, Typography } from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import { IconButton, InputAdornment, Switch, CircularProgress } from "@mui/material";
import Visibility from "@material-ui/icons/Visibility";
import VisibilityOff from "@material-ui/icons/VisibilityOff";
import EmailIcon from "@material-ui/icons/Email";
import LockIcon from "@material-ui/icons/Lock";
import { Helmet } from "react-helmet";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => {
  return {
    "@keyframes fadeInUp": {
      "0%": {
        opacity: 0,
        transform: "translateY(24px)",
      },
      "100%": {
        opacity: 1,
        transform: "translateY(0)",
      },
    },
    "@keyframes shimmer": {
      "0%": { backgroundPosition: "-200% 0" },
      "100%": { backgroundPosition: "200% 0" },
    },
    "@keyframes pulse": {
      "0%, 100%": { boxShadow: "0 0 0 0 rgba(13, 148, 136, 0.4)" },
      "50%": { boxShadow: "0 0 0 12px rgba(13, 148, 136, 0)" },
    },
    "@keyframes fadeIn": {
      "0%": { opacity: 0 },
      "100%": { opacity: 1 },
    },
    root: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      minHeight: "100vh",
      background: "linear-gradient(160deg, #f0fdfa 0%, #e0f2fe 35%, #f5f3ff 70%, #faf5ff 100%)",
      backgroundSize: "400% 400%",
      padding: theme.spacing(2),
      boxSizing: "border-box",
      position: "relative",
      overflow: "hidden",
      "&::before": {
        content: '""',
        position: "absolute",
        top: "-50%",
        left: "-50%",
        width: "200%",
        height: "200%",
        background: "radial-gradient(circle at 30% 20%, rgba(13, 148, 136, 0.06) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(99, 102, 241, 0.05) 0%, transparent 50%)",
        pointerEvents: "none",
      },
      [theme.breakpoints.down("xs")]: {
        padding: theme.spacing(1.5),
        alignItems: "flex-start",
        paddingTop: "min(24px, 5vh)",
      },
    },
    formContainer: {
      position: "relative",
      zIndex: 1,
      width: "100%",
      maxWidth: "420px",
      background: "rgba(255, 255, 255, 0.92)",
      backdropFilter: "blur(20px)",
      borderRadius: "20px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 40px -10px rgba(13, 148, 136, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.8) inset",
      padding: "40px 36px",
      animation: "$fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",
      transition: "box-shadow 0.3s ease, transform 0.3s ease",
      "&:hover": {
        boxShadow: "0 20px 50px -15px rgba(13, 148, 136, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.9) inset",
      },
      "&:focus-within": {
        outline: "none",
        boxShadow: "0 0 0 3px rgba(13, 148, 136, 0.25), 0 20px 50px -15px rgba(13, 148, 136, 0.2)",
      },
      [theme.breakpoints.down("xs")]: {
        padding: "28px 20px",
        maxWidth: "100%",
        borderRadius: "16px",
      },
    },
    logoImg: {
      display: "block",
      margin: "0 auto 24px",
      maxWidth: "120px",
      height: "auto",
      transition: "transform 0.3s ease",
      "&:hover": {
        transform: "scale(1.02)",
      },
      [theme.breakpoints.down("xs")]: {
        maxWidth: "100px",
        marginBottom: "20px",
      },
    },
    title: {
      textAlign: "center",
      marginBottom: "6px",
      fontWeight: 700,
      color: "#0f172a",
      fontSize: "1.5rem",
      letterSpacing: "-0.02em",
      [theme.breakpoints.down("xs")]: {
        fontSize: "1.25rem",
      },
    },
    subtitle: {
      textAlign: "center",
      marginBottom: "28px",
      color: "#64748b",
      fontSize: "0.9375rem",
      fontWeight: 500,
      [theme.breakpoints.down("xs")]: {
        fontSize: "0.875rem",
        marginBottom: "24px",
      },
    },
    inputRoot: {
      "& .MuiOutlinedInput-root": {
        borderRadius: "12px",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        "& fieldset": {
          borderColor: "#e2e8f0",
          borderWidth: "1.5px",
          transition: "border-color 0.25s ease, box-shadow 0.25s ease",
        },
        "&:hover fieldset": {
          borderColor: "#94a3b8",
        },
        "&.Mui-focused fieldset": {
          borderColor: "#0d9488",
          borderWidth: "2px",
          boxShadow: "0 0 0 4px rgba(13, 148, 136, 0.12)",
        },
      },
      "& .MuiOutlinedInput-input": {
        padding: "14px 16px",
        fontSize: "1rem",
        transition: "transform 0.2s ease",
        "&::placeholder": {
          opacity: 0.7,
        },
        [theme.breakpoints.down("xs")]: {
          padding: "12px 14px",
          fontSize: "0.9375rem",
        },
      },
      "& .MuiInputLabel-outlined": {
        fontSize: "1rem",
        [theme.breakpoints.down("xs")]: {
          fontSize: "0.9375rem",
        },
      },
      "& .MuiInputAdornment-root .MuiSvgIcon-root": {
        color: "#64748b",
        transition: "color 0.2s ease",
      },
      "& .MuiOutlinedInput-root:hover .MuiInputAdornment-root .MuiSvgIcon-root": {
        color: "#0d9488",
      },
      "& .MuiOutlinedInput-root.Mui-focused .MuiInputAdornment-root .MuiSvgIcon-root": {
        color: "#0d9488",
      },
    },
    submitBtn: {
      position: "relative",
      marginTop: "24px",
      background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
      color: "#fff",
      borderRadius: "12px",
      padding: "14px 24px",
      fontWeight: 600,
      width: "100%",
      textTransform: "none",
      fontSize: "1rem",
      boxShadow: "0 4px 14px rgba(13, 148, 136, 0.35)",
      minHeight: "52px",
      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      "&:hover": {
        background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
        boxShadow: "0 6px 20px rgba(13, 148, 136, 0.45)",
        transform: "translateY(-1px)",
      },
      "&:active": {
        transform: "translateY(0)",
        boxShadow: "0 2px 10px rgba(13, 148, 136, 0.3)",
      },
      "&:disabled": {
        background: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
        color: "rgba(255,255,255,0.9)",
      },
      "&:focus-visible": {
        outline: "none",
        boxShadow: "0 0 0 3px rgba(255,255,255,0.8), 0 0 0 6px rgba(13, 148, 136, 0.4)",
      },
      [theme.breakpoints.down("xs")]: {
        padding: "12px 20px",
        fontSize: "0.9375rem",
        marginTop: "20px",
        minHeight: "48px",
      },
    },
    registerBtn: {
      backgroundColor: "transparent",
      color: "#0d9488",
      border: "2px solid #0d9488",
      borderRadius: "12px",
      padding: "14px 24px",
      fontWeight: 600,
      width: "100%",
      textTransform: "none",
      fontSize: "1rem",
      marginTop: "12px",
      minHeight: "52px",
      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      "&:hover": {
        backgroundColor: "rgba(13, 148, 136, 0.08)",
        borderColor: "#0f766e",
        color: "#0f766e",
        transform: "translateY(-1px)",
      },
      "&:active": {
        transform: "translateY(0)",
      },
      "&:focus-visible": {
        outline: "none",
        boxShadow: "0 0 0 3px rgba(13, 148, 136, 0.35)",
      },
      [theme.breakpoints.down("xs")]: {
        padding: "12px 20px",
        fontSize: "0.9375rem",
        minHeight: "48px",
      },
    },
    rememberMeContainer: {
      display: "flex",
      alignItems: "center",
      marginTop: "14px",
    },
    rememberMeLabel: {
      fontSize: "0.9375rem",
      color: "#475569",
      fontWeight: 500,
      [theme.breakpoints.down("xs")]: {
        fontSize: "0.875rem",
      },
    },
    errorMessage: {
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1),
      padding: "8px 12px",
      borderRadius: "8px",
      backgroundColor: "rgba(239, 68, 68, 0.08)",
      color: "#dc2626",
      fontSize: "0.875rem",
      fontWeight: 500,
    },
    buttonProgress: {
      color: "#fff",
      position: "absolute",
      top: "50%",
      left: "50%",
      marginTop: -12,
      marginLeft: -12,
    },
    buttonWrapper: {
      position: "relative",
      width: "100%",
    },
    footer: {
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      padding: "14px 24px",
      textAlign: "center",
      pointerEvents: "none",
      userSelect: "none",
      animation: "$fadeIn 0.8s ease 0.4s forwards",
      opacity: 0,
      [theme.breakpoints.down("xs")]: {
        padding: "12px 16px",
      },
    },
    footerInner: {
      maxWidth: 420,
      margin: "0 auto",
      padding: "12px 16px",
      borderRadius: "12px",
      background: "rgba(255, 255, 255, 0.55)",
      backdropFilter: "blur(10px)",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
      border: "1px solid rgba(255, 255, 255, 0.7)",
      pointerEvents: "none",
      userSelect: "none",
    },
    footerText: {
      fontSize: "0.8125rem",
      color: "#64748b",
      fontWeight: 500,
      letterSpacing: "0.02em",
      userSelect: "none",
      [theme.breakpoints.down("xs")]: {
        fontSize: "0.75rem",
      },
    },
    footerBrand: {
      fontSize: "0.6875rem",
      color: "#94a3b8",
      marginTop: 4,
      fontWeight: 500,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      userSelect: "none",
    },
  };
});

const Login = () => {
  const classes = useStyles();
  const theme = useTheme();
  const { handleLogin, loading } = useContext(AuthContext);
  const logoUrl = theme.calculatedLogoLight?.() ?? theme.appLogoLight ?? "/logo.png";
  const [user, setUser] = useState({ email: "", password: "", remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [userCreationEnabled, setUserCreationEnabled] = useState(true);

  const backendUrl =
    process.env.REACT_APP_BACKEND_URL === "https://localhost:8090"
      ? "https://localhost:8090"
      : process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    const fetchUserCreationStatus = async () => {
      try {
        const response = await fetch(`${backendUrl}/settings/userCreation`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error("Failed to fetch user creation status");
        const data = await response.json();
        setUserCreationEnabled(data.userCreation === "enabled");
      } catch (err) {
        console.error("Erro ao verificar userCreation:", err);
        setUserCreationEnabled(false);
      }
    };
    fetchUserCreationStatus();
  }, [backendUrl]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!user.email?.trim()) {
      setError("Informe seu e-mail.");
      return;
    }
    if (!user.password) {
      setError("Informe sua senha.");
      return;
    }
    handleLogin(user);
  };

  return (
    <>
      <Helmet>
        <title>Login</title>
      </Helmet>

      <div className={classes.root} role="main" aria-label="Página de login">
        <form
          className={classes.formContainer}
          onSubmit={handleSubmit}
          noValidate
          autoComplete="on"
          aria-label="Formulário de login"
        >
          <img
            src={logoUrl}
            alt="Logo da plataforma"
            className={classes.logoImg}
            loading="eager"
          />
          <Typography component="h1" className={classes.title}>
            Acesso ao sistema
          </Typography>
          <Typography className={classes.subtitle}>
            Entre com suas credenciais para continuar
          </Typography>

          {error && (
            <Typography component="p" className={classes.errorMessage} role="alert">
              {error}
            </Typography>
          )}

          <TextField
            label="Email"
            placeholder="seu@email.com"
            variant="outlined"
            fullWidth
            margin="normal"
            type="email"
            name="email"
            autoComplete="email"
            value={user.email}
            onChange={(e) => setUser({ ...user, email: e.target.value })}
            className={classes.inputRoot}
            aria-describedby={error ? "login-error" : undefined}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" aria-hidden="true">
                  <EmailIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Senha"
            placeholder="Digite sua senha"
            variant="outlined"
            fullWidth
            margin="normal"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            value={user.password}
            onChange={(e) => setUser({ ...user, password: e.target.value })}
            className={classes.inputRoot}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" aria-hidden="true">
                  <LockIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    onMouseDown={(e) => e.preventDefault()}
                    edge="end"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    tabIndex={-1}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <div className={classes.rememberMeContainer}>
            <Switch
              id="remember"
              checked={user.remember}
              onChange={(e) => setUser({ ...user, remember: e.target.checked })}
              name="remember"
              inputProps={{ "aria-label": "Lembrar de mim" }}
              sx={{
                "& .MuiSwitch-thumb": {
                  backgroundColor: user.remember ? "#0d9488" : "#cbd5e1",
                },
                "& .Mui-checked": { color: "#0d9488" },
                "& .Mui-checked + .MuiSwitch-track": { backgroundColor: "#0d9488" },
                "& .MuiSwitch-track": { backgroundColor: user.remember ? "#0d9488" : "#cbd5e1" },
              }}
            />
            <Typography component="label" className={classes.rememberMeLabel} htmlFor="remember">
              Lembrar de mim
            </Typography>
          </div>

          <div className={classes.buttonWrapper}>
            <Button
              type="submit"
              variant="contained"
              className={classes.submitBtn}
              disabled={loading}
              aria-busy={loading}
              aria-label={loading ? "Entrando..." : "Entrar"}
              style={{ color: loading ? "transparent" : undefined }}
            >
              {loading && <CircularProgress size={24} className={classes.buttonProgress} />}
              Entrar
            </Button>
            {userCreationEnabled && (
              <Button
                component={RouterLink}
                to="/signup"
                variant="outlined"
                className={classes.registerBtn}
                disabled={loading}
                aria-label="Ir para cadastro"
              >
                Cadastre-se
              </Button>
            )}
          </div>
        </form>

        <footer className={classes.footer} role="contentinfo" aria-label="Rodapé">
          <div className={classes.footerInner}>
            <Typography component="p" className={classes.footerText}>
              © {new Date().getFullYear()} · Acesso seguro e rápido
            </Typography>
            <Typography component="p" className={classes.footerBrand}>
              Multizap
            </Typography>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Login;
