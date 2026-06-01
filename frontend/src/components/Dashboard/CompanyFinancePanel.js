import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Grid,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import moment from "moment";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import HelpHint from "../HelpHint";

const fmtBRL = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CompanyFinancePanel = () => {
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(moment().startOf("month").format("YYYY-MM-DD"));
  const [dateTo, setDateTo] = useState(moment().format("YYYY-MM-DD"));
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get("/dashboard/commercial-metrics", {
        params: { date_from: dateFrom, date_to: dateTo },
      });
      setData(res);
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const s = data?.summary || {};
  const totalPeriod = (data?.revenueByDay || []).reduce(
    (acc, d) => acc + Number(d.revenue),
    0
  );

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6" fontWeight="bold">
            Faturamento da empresa
          </Typography>
          <HelpHint areaKey="budgets" />
        </Box>
        <Box display="flex" gap={1}>
          <TextField
            type="date"
            size="small"
            label="De"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="date"
            size="small"
            label="Até"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Receita no período
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="primary">
                {fmtBRL(s.totalRevenue)}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Orçamentos aprovados
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {s.approvedBudgetsCount ?? 0}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Evolução (soma diária)
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {fmtBRL(totalPeriod)}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Os valores são calculados automaticamente a partir de ordens de serviço e orçamentos
              aprovados registrados no sistema.
            </Typography>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default CompanyFinancePanel;
