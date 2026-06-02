import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import moment from "moment";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import HelpHint from "../HelpHint";

const fmtBRL = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CommercialBiPanel = () => {
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
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const s = data?.summary || {};

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6" fontWeight="bold">
            BI Comercial
          </Typography>
          <HelpHint areaKey="budgets" />
        </Box>
        <Box display="flex" gap={1} flexWrap="wrap">
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
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: "Receita total", value: fmtBRL(s.totalRevenue) },
              { label: "Vendas (OS)", value: s.salesCount ?? 0 },
              { label: "Ticket médio", value: fmtBRL(s.avgTicket) },
              { label: "Atendimentos", value: s.attendancesCount ?? 0 },
              { label: "Orçamentos aprovados", value: s.approvedBudgetsCount ?? 0 },
            ].map((card) => (
              <Grid item xs={12} sm={6} md={4} lg={2.4} key={card.label}>
                <Paper sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    {card.label}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {card.value}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Desempenho por vendedor / atendente
          </Typography>
          <Paper sx={{ borderRadius: 2, overflow: "hidden", mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Vendedor</TableCell>
                  <TableCell align="right">Atendimentos</TableCell>
                  <TableCell align="right">Vendas</TableCell>
                  <TableCell align="right">Valor total</TableCell>
                  <TableCell align="right">Ticket médio</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.byUser || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Sem dados no período
                    </TableCell>
                  </TableRow>
                ) : (
                  data.byUser.map((row) => (
                    <TableRow key={row.userId}>
                      <TableCell>{row.userName}</TableCell>
                      <TableCell align="right">{row.attendancesCount}</TableCell>
                      <TableCell align="right">{row.salesCount}</TableCell>
                      <TableCell align="right">{fmtBRL(row.totalRevenue)}</TableCell>
                      <TableCell align="right">{fmtBRL(row.avgTicket)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>

          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Produtos mais vendidos
          </Typography>
          <Paper sx={{ borderRadius: 2, overflow: "hidden", mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell align="right">Qtd vendida</TableCell>
                  <TableCell align="right">Receita</TableCell>
                  <TableCell align="right">Ticket médio</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.topProducts || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Sem dados no período
                    </TableCell>
                  </TableRow>
                ) : (
                  data.topProducts.map((row, idx) => (
                    <TableRow key={`${row.productId || "x"}-${idx}`}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell align="right">{row.qty}</TableCell>
                      <TableCell align="right">{fmtBRL(row.revenue)}</TableCell>
                      <TableCell align="right">{fmtBRL(row.avgTicket)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>

          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Faturamento por categoria
          </Typography>
          <Paper sx={{ borderRadius: 2, overflow: "hidden", mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Categoria</TableCell>
                  <TableCell align="right">Qtd vendida</TableCell>
                  <TableCell align="right">Receita</TableCell>
                  <TableCell align="right">Ticket médio</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.topCategories || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Sem dados no período
                    </TableCell>
                  </TableRow>
                ) : (
                  data.topCategories.map((row) => (
                    <TableRow key={row.category}>
                      <TableCell>{row.category}</TableCell>
                      <TableCell align="right">{row.qty}</TableCell>
                      <TableCell align="right">{fmtBRL(row.revenue)}</TableCell>
                      <TableCell align="right">{fmtBRL(row.avgTicket)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>

          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Faturamento por dia
          </Typography>
          <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell align="right">Vendas</TableCell>
                  <TableCell align="right">Receita</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.revenueByDay || []).map((row) => (
                  <TableRow key={row.date}>
                    <TableCell>{moment(row.date).format("DD/MM/YYYY")}</TableCell>
                    <TableCell align="right">{row.salesCount}</TableCell>
                    <TableCell align="right">{fmtBRL(row.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default CommercialBiPanel;
