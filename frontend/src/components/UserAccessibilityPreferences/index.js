import React, { useContext, useState } from "react";
import {
  Box,
  Button,
  FormControlLabel,
  Paper,
  Switch,
  Typography,
  makeStyles,
} from "@material-ui/core";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { getUiPreferences } from "../../utils/permissions";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
    maxWidth: 560,
  },
  hint: {
    marginBottom: theme.spacing(2),
    color: theme.palette.text.secondary,
    fontSize: "0.875rem",
  },
}));

const PREFS = [
  {
    key: "showQuickReplies",
    label: "Mostrar painel de respostas rápidas no atendimento",
    default: true,
  },
  {
    key: "showInboxTagFolders",
    label: "Mostrar pastas e etapas na caixa de entrada",
    default: true,
  },
  {
    key: "showInternalChat",
    label: "Mostrar atalho de chat interno no menu",
    default: true,
  },
];

const UserAccessibilityPreferences = () => {
  const classes = useStyles();
  const { user, refreshUser } = useContext(AuthContext);
  const initial = getUiPreferences(user);

  const [prefs, setPrefs] = useState(() => {
    const o = {};
    PREFS.forEach((p) => {
      o[p.key] = initial[p.key] !== false && initial[p.key] !== "hidden";
    });
    return o;
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/users/${user.id}`, { uiPreferences: prefs });
      if (typeof refreshUser === "function") await refreshUser();
      toast.success("Preferências salvas. Recarregue a página se algo não atualizar.");
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper className={classes.root} variant="outlined">
      <Typography variant="h6" gutterBottom>
        Acessibilidade e exibição
      </Typography>
      <Typography className={classes.hint}>
        Personalize o que deseja ver na interface. As preferências são salvas na sua conta
        e aplicadas nos próximos acessos.
      </Typography>
      {PREFS.map((p) => (
        <Box key={p.key} mb={1}>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(prefs[p.key])}
                onChange={(e) =>
                  setPrefs((prev) => ({ ...prev, [p.key]: e.target.checked }))
                }
                color="primary"
              />
            }
            label={p.label}
          />
        </Box>
      ))}
      <Box mt={2}>
        <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
          Salvar preferências
        </Button>
      </Box>
    </Paper>
  );
};

export default UserAccessibilityPreferences;
