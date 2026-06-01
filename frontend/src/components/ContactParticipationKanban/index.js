import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  CircularProgress,
  Paper,
  Typography,
  makeStyles,
} from "@material-ui/core";
import FiberManualRecordIcon from "@material-ui/icons/FiberManualRecord";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  boardWrap: {
    marginBottom: theme.spacing(2),
  },
  boardTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: theme.spacing(1),
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  boardDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
  },
  columnsRow: {
    display: "flex",
    gap: theme.spacing(1),
    overflowX: "auto",
    paddingBottom: theme.spacing(0.5),
    WebkitOverflowScrolling: "touch",
  },
  column: {
    minWidth: 140,
    maxWidth: 180,
    flex: "0 0 auto",
    backgroundColor:
      theme.palette.type === "dark" ? theme.palette.grey[900] : theme.palette.grey[100],
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(0.75),
  },
  columnTitle: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.75),
    padding: "0 4px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  card: {
    padding: "6px 8px",
    borderRadius: 6,
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(0.5),
    cursor: "default",
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 600,
    lineHeight: 1.25,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  cardMeta: {
    fontSize: 9,
    color: theme.palette.text.secondary,
    marginTop: 2,
    display: "flex",
    alignItems: "center",
    gap: 3,
  },
  emptyCol: {
    fontSize: 10,
    color: theme.palette.text.disabled,
    padding: "4px 6px",
    fontStyle: "italic",
  },
  loadingBox: {
    display: "flex",
    justifyContent: "center",
    padding: theme.spacing(2),
  },
}));

const STATUS_COLORS = {
  aguardando: "#fbc02d",
  em_andamento: "#1976d2",
  concluido: "#388e3c",
  cancelado: "#d32f2f",
};

const STATUS_LABELS = {
  aguardando: "Aguardando",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const ContactParticipationKanban = ({ contact, contactProcesses, loading }) => {
  const classes = useStyles();
  const [boards, setBoards] = useState({});
  const [loadingBoards, setLoadingBoards] = useState(false);

  const groupIds = useMemo(
    () => (contactProcesses || []).map((p) => String(p.groupId)),
    [contactProcesses]
  );

  const loadBoard = useCallback(
    async (groupId, stages) => {
      if (!contact?.id) return { columns: [], cards: [] };
      const { data } = await api.get("/ticket/kanban", {
        params: { contactId: contact.id, quadroGroupId: groupId },
      });
      const ticketsList = data.tickets || data || [];
      const enriched = await Promise.all(
        ticketsList.map(async (t) => {
          let quadroData = null;
          try {
            const { data: qd } = await api.get(`/tickets/${t.uuid || t.id}/quadro`);
            quadroData = qd.quadro || null;
          } catch (_) {
            /* noop */
          }
          const tagName =
            t.tags?.find((tag) => Number(tag.kanban) === 1)?.name ||
            t.tags?.[0]?.tag ||
            t.tags?.[0]?.name ||
            "";
          return {
            id: t.id,
            nomeProjeto: quadroData?.nomeProjeto || t.contact?.name || contact.name,
            status: quadroData?.status || "aguardando",
            tagName,
            valorServico: quadroData?.valorServico || 0,
          };
        })
      );

      let columnNames = Array.isArray(stages) ? [...stages] : [];
      if (columnNames.length === 0) {
        try {
          const { data: tagsData } = await api.get("/tags", {
            params: { kanban: 1, quadroGroupId: groupId },
          });
          const tags = tagsData.tags || tagsData || [];
          columnNames = tags.map((tg) => tg.name).filter(Boolean);
        } catch (_) {
          columnNames = ["Sem etapa"];
        }
      }
      if (columnNames.length === 0) columnNames = ["Sem etapa"];

      const columns = columnNames.map((name) => ({ id: name, title: name, cards: [] }));
      const otherCol = { id: "__other", title: "Outros", cards: [] };

      for (const card of enriched) {
        const stage = (card.tagName || "").trim();
        const col = columns.find(
          (c) => c.title.toLowerCase() === stage.toLowerCase()
        );
        if (col) col.cards.push(card);
        else otherCol.cards.push(card);
      }

      const result = otherCol.cards.length ? [...columns, otherCol] : columns;
      return result;
    },
    [contact]
  );

  useEffect(() => {
    if (!contact?.id || !groupIds.length) {
      setBoards({});
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingBoards(true);
      const next = {};
      try {
        await Promise.all(
          (contactProcesses || []).map(async (proc) => {
            const gid = String(proc.groupId);
            next[gid] = await loadBoard(gid, proc.stages);
          })
        );
        if (!cancelled) setBoards(next);
      } catch (_) {
        if (!cancelled) setBoards({});
      } finally {
        if (!cancelled) setLoadingBoards(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contact?.id, contactProcesses, groupIds, loadBoard]);

  if (loading || loadingBoards) {
    return (
      <div className={classes.loadingBox}>
        <CircularProgress size={24} />
      </div>
    );
  }

  if (!contactProcesses?.length) {
    return (
      <Paper variant="outlined" style={{ padding: 16, textAlign: "center", borderRadius: 10 }}>
        <Typography variant="body2" color="textSecondary">
          Este contato não participa de nenhum fluxo Kanban no momento.
        </Typography>
      </Paper>
    );
  }

  const palette = ["#1976d2", "#2e7d32", "#ed6c02", "#9c27b0", "#00838f"];

  return (
    <Box>
      {contactProcesses.map((proc, idx) => {
        const gid = String(proc.groupId);
        const columns = boards[gid] || [];
        const dotColor = palette[idx % palette.length];
        return (
          <div key={gid} className={classes.boardWrap}>
            <Typography className={classes.boardTitle}>
              <span className={classes.boardDot} style={{ backgroundColor: dotColor }} />
              {proc.groupName || "Área de trabalho"}
              <Typography component="span" variant="caption" color="textSecondary">
                ({proc.count} card{proc.count !== 1 ? "s" : ""})
              </Typography>
            </Typography>
            <div className={classes.columnsRow}>
              {columns.length === 0 ? (
                <Typography variant="caption" color="textSecondary">
                  Carregando etapas…
                </Typography>
              ) : (
                columns.map((col) => (
                  <div key={col.id} className={classes.column}>
                    <div className={classes.columnTitle}>{col.title}</div>
                    {col.cards.length === 0 ? (
                      <div className={classes.emptyCol}>—</div>
                    ) : (
                      col.cards.map((card) => (
                        <Paper key={card.id} elevation={0} className={classes.card}>
                          <div className={classes.cardTitle}>
                            {card.nomeProjeto || "Card"}
                          </div>
                          <div className={classes.cardMeta}>
                            <FiberManualRecordIcon
                              style={{
                                fontSize: 8,
                                color: STATUS_COLORS[card.status] || "#9e9e9e",
                              }}
                            />
                            {STATUS_LABELS[card.status] || card.status}
                            {card.valorServico > 0 && (
                              <span style={{ marginLeft: 4, fontWeight: 600, color: "#2e7d32" }}>
                                R${" "}
                                {Number(card.valorServico).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 0,
                                })}
                              </span>
                            )}
                          </div>
                        </Paper>
                      ))
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </Box>
  );
};

export default ContactParticipationKanban;
