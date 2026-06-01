import React from "react";
import { Box, Chip, Typography, makeStyles } from "@material-ui/core";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  wrap: {
    marginTop: theme.spacing(1),
    padding: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
  },
  chips: {
    display: "flex",
    flexWrap: "wrap",
    marginTop: theme.spacing(0.5),
  },
  chip: {
    margin: theme.spacing(0.25),
    cursor: "pointer",
    "&.Mui-disabled": { cursor: "default" },
  },
}));

/** Variáveis de mensagem só para o modal do painel (sem MessageVariablesPicker). */
const SidebarQuickMessageVariablesChips = ({ disabled, onInsert }) => {
  const classes = useStyles();

  const msgVars = [
    { name: i18n.t("messageVariablesPicker.vars.contactFirstName"), value: "{{firstName}}" },
    { name: i18n.t("messageVariablesPicker.vars.contactName"), value: "{{name}} " },
    { name: i18n.t("messageVariablesPicker.vars.contactNamePt"), value: "{{nome}}" },
    { name: i18n.t("messageVariablesPicker.vars.user"), value: "{{userName}} " },
    { name: i18n.t("messageVariablesPicker.vars.greeting"), value: "{{ms}} " },
    { name: i18n.t("messageVariablesPicker.vars.protocolNumber"), value: "{{protocol}} " },
    { name: i18n.t("messageVariablesPicker.vars.date"), value: "{{date}} " },
    { name: i18n.t("messageVariablesPicker.vars.hour"), value: "{{hour}} " },
    { name: i18n.t("messageVariablesPicker.vars.ticket_id"), value: "{{ticket_id}} " },
    { name: i18n.t("messageVariablesPicker.vars.queue"), value: "{{queue}} " },
    { name: i18n.t("messageVariablesPicker.vars.connection"), value: "{{connection}} " },
    { name: i18n.t("messageVariablesPicker.vars.phone"), value: "{{telefone}} " },
    { name: i18n.t("messageVariablesPicker.vars.email"), value: "{{email}} " },
    { name: i18n.t("messageVariablesPicker.vars.company"), value: "{{empresa}} " },
  ];

  const handleMouseDown = (e, value) => {
    e.preventDefault();
    if (disabled) return;
    onInsert(value);
  };

  return (
    <Box className={classes.wrap}>
      <Typography variant="caption" color="textSecondary">
        {i18n.t("messageVariablesPicker.label")}
      </Typography>
      <Box className={classes.chips}>
        {msgVars.map((msgVar) => (
          <Chip
            key={msgVar.value}
            onMouseDown={(e) => handleMouseDown(e, msgVar.value)}
            label={msgVar.name}
            size="small"
            className={classes.chip}
            color="primary"
            disabled={disabled}
          />
        ))}
      </Box>
    </Box>
  );
};

export default SidebarQuickMessageVariablesChips;
