import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import AssignmentIcon from "@material-ui/icons/Assignment";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { fieldsFromCatalogProduct, serializeOrderItem } from "../../utils/catalogProduct";
import { unitLabel } from "../../utils/productUnits";

const emptyItem = () => ({
  code: "",
  description: "",
  qty: 1,
  unit: "un",
  unitPrice: 0,
  total: 0,
  productId: null,
  category: "",
});

const recalcLine = (row) => {
  const qty = Number(row.qty) || 0;
  const unit = Number(row.unitPrice) || 0;
  return { ...row, total: Math.round(qty * unit * 100) / 100 };
};

const OrderServiceModal = ({ open, onClose, ticket, contact, onAfterSave }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([emptyItem()]);
  const [notes, setNotes] = useState("");
  const [catalogProducts, setCatalogProducts] = useState([]);

  const totals = useMemo(
    () => items.reduce((acc, it) => acc + (Number(it.total) || 0), 0),
    [items]
  );

  const reset = useCallback(() => {
    setItems([emptyItem()]);
    setNotes("");
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
    api
      .get("/products/active")
      .then(({ data }) => setCatalogProducts(Array.isArray(data) ? data : []))
      .catch(() => setCatalogProducts([]));
  }, [open, reset]);

  const applyCatalogProduct = (idx, productId) => {
    if (!productId) return;
    const p = catalogProducts.find((x) => String(x.id) === String(productId));
    const fields = fieldsFromCatalogProduct(p);
    if (!fields) return;
    setItems((prev) =>
      prev.map((r, i) => (i === idx ? recalcLine({ ...r, ...fields }) : r))
    );
  };

  const handleSave = async () => {
    const normalized = items
      .map((it, i) => recalcLine(serializeOrderItem(it, i)))
      .filter((it) => it.description);
    if (!normalized.length) {
      toast.warning("Informe ao menos um item com descrição.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/ticket-budget-orders", {
        ticketId: ticket?.id ?? null,
        contactId: contact?.id ?? null,
        items: normalized,
      });
      toast.success(`OS ${data.orderNumber || ""} criada com sucesso.`);
      if (onAfterSave) onAfterSave(data);
      onClose();
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <AssignmentIcon style={{ verticalAlign: "middle", marginRight: 8 }} />
        Nova ordem de serviço (OS)
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="textSecondary" paragraph>
          Crie uma OS diretamente, sem orçamento prévio. Selecione produtos do catálogo ou
          preencha os itens manualmente.
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={2}
          variant="outlined"
          size="small"
          label="Observações da OS (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        {catalogProducts.length > 0 && (
          <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 8 }}>
            Vincule itens ao catálogo de produtos cadastrado ou preencha manualmente.
          </Typography>
        )}
        {items.map((row, idx) => (
          <Grid container spacing={1} key={idx} alignItems="center" style={{ marginBottom: 8 }}>
            {catalogProducts.length > 0 && (
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  variant="outlined"
                  label="Produto cadastrado"
                  value={row.productId || ""}
                  onChange={(e) => applyCatalogProduct(idx, e.target.value)}
                >
                  <MenuItem value="">
                    <em>Selecionar do catálogo…</em>
                  </MenuItem>
                  {catalogProducts.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                      {p.code ? ` (${p.code})` : ""} —{" "}
                      {(Number(p.price) || 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                label="Descrição"
                value={row.description}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = recalcLine({ ...next[idx], description: e.target.value });
                  setItems(next);
                }}
              />
            </Grid>
            <Grid item xs={4} sm={1}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                label="Un."
                value={unitLabel(row.unit)}
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={4} sm={2}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                label="Qtd"
                type="number"
                value={row.qty}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = recalcLine({ ...next[idx], qty: e.target.value });
                  setItems(next);
                }}
              />
            </Grid>
            <Grid item xs={4} sm={2}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                label="Valor un."
                type="number"
                value={row.unitPrice}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = recalcLine({ ...next[idx], unitPrice: e.target.value });
                  setItems(next);
                }}
              />
            </Grid>
            <Grid item xs={3} sm={2}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                label="Total"
                value={row.total}
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={1}>
              <IconButton
                size="small"
                disabled={items.length <= 1}
                onClick={() => setItems(items.filter((_, i) => i !== idx))}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Grid>
          </Grid>
        ))}
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setItems([...items, emptyItem()])}
        >
          Adicionar item
        </Button>
        <Typography variant="subtitle2" align="right" style={{ marginTop: 16 }}>
          Total:{" "}
          {totals.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button color="primary" variant="contained" onClick={handleSave} disabled={loading}>
          {loading ? "Salvando…" : "Criar OS"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrderServiceModal;
