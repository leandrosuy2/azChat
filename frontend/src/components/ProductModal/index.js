import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from "@material-ui/core";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { getBackendUrl } from "../../config";
import { buildUnitOptions } from "../../utils/productUnits";

const backendUrl = getBackendUrl();

const emptyForm = () => ({
  name: "",
  description: "",
  code: "",
  categoryId: "",
  subcategoryId: "",
  unit: "un",
  price: "",
  costPrice: "",
  status: "active",
  internalNotes: "",
  imageUrl: "",
});

const ProductModal = ({ open, onClose, productId, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [categories, setCategories] = useState([]);
  const [customUnits, setCustomUnits] = useState([]);
  const [newCustomUnit, setNewCustomUnit] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const subcategories = useMemo(() => {
    if (!form.categoryId) return [];
    const cat = categories.find((c) => String(c.id) === String(form.categoryId));
    return cat?.children || [];
  }, [categories, form.categoryId]);

  const unitOptions = useMemo(
    () => buildUnitOptions(customUnits),
    [customUnits]
  );

  useEffect(() => {
    if (!open) return;
    setImageFile(null);
    api
      .get("/product-categories")
      .then(({ data }) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
    api
      .get("/products/units")
      .then(({ data }) => setCustomUnits(data?.customUnits || []))
      .catch(() => setCustomUnits([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!productId) {
      setForm(emptyForm());
      return;
    }
    (async () => {
      try {
        const { data } = await api.get(`/products/${productId}`);
        setForm({
          name: data.name || "",
          description: data.description || "",
          code: data.code || "",
          categoryId: data.categoryId || "",
          subcategoryId: data.subcategoryId || "",
          unit: data.unit || "un",
          price: String(data.price ?? ""),
          costPrice: String(data.costPrice ?? ""),
          status: data.status || "active",
          internalNotes: data.internalNotes || "",
          imageUrl: data.imageUrl || "",
        });
      } catch (e) {
        toastError(e);
      }
    })();
  }, [open, productId]);

  const stopSubmitEvent = (event) => {
    if (!event) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const handleAddCustomUnit = async (event) => {
    stopSubmitEvent(event);
    const name = newCustomUnit.trim();
    if (!name) return;
    try {
      const { data } = await api.post("/products/units", { name });
      setCustomUnits((prev) => [...prev, data]);
      setForm((prev) => ({
        ...prev,
        unit: data.abbreviation || String(data.id),
      }));
      setNewCustomUnit("");
      toast.success("Unidade personalizada adicionada.");
    } catch (e) {
      toastError(e);
    }
  };

  const handleSave = async (event) => {
    stopSubmitEvent(event);
    if (!form.name.trim()) {
      toast.warning("Informe o nome do produto.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        code: form.code,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        subcategoryId: form.subcategoryId ? Number(form.subcategoryId) : null,
        unit: form.unit || "un",
        price: Number(form.price) || 0,
        costPrice: Number(form.costPrice) || 0,
        status: form.status,
        internalNotes: form.internalNotes,
      };

      let savedId = productId;
      if (productId) {
        await api.put(`/products/${productId}`, payload);
        toast.success("Produto atualizado.");
      } else {
        const { data } = await api.post("/products", payload);
        savedId = data.id;
        toast.success("Produto cadastrado.");
      }

      if (imageFile && savedId) {
        const fd = new FormData();
        fd.append("file", imageFile);
        await api.post(`/products/${savedId}/image`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      if (onSaved) onSaved();
      onClose();
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  };

  const previewUrl = imageFile
    ? URL.createObjectURL(imageFile)
    : form.imageUrl
      ? `${backendUrl}${form.imageUrl}`
      : null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{productId ? "Editar produto" : "Novo produto"}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              margin="dense"
              label="Nome *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              margin="dense"
              label="Código / SKU"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              margin="dense"
              select
              label="Categoria"
              value={form.categoryId}
              onChange={(e) =>
                setForm({
                  ...form,
                  categoryId: e.target.value,
                  subcategoryId: "",
                })
              }
            >
              <MenuItem value="">—</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              margin="dense"
              select
              label="Subcategoria"
              value={form.subcategoryId}
              disabled={!form.categoryId}
              onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })}
            >
              <MenuItem value="">—</MenuItem>
              {subcategories.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              margin="dense"
              select
              label="Unidade"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            >
              {unitOptions.map((u) => (
                <MenuItem key={u.value} value={u.value}>
                  {u.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              margin="dense"
              label="Valor de venda (R$)"
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              margin="dense"
              label="Valor de custo (R$)"
              type="number"
              value={form.costPrice}
              onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              margin="dense"
              select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <MenuItem value="active">Ativo</MenuItem>
              <MenuItem value="inactive">Inativo</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={8}>
            <Box display="flex" gap={1} alignItems="center" mt={1}>
              <TextField
                size="small"
                label="Unidade personalizada"
                value={newCustomUnit}
                onChange={(e) => setNewCustomUnit(e.target.value)}
                fullWidth
              />
              <Button type="button" variant="outlined" onClick={handleAddCustomUnit}>
                Adicionar
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              margin="dense"
              multiline
              minRows={2}
              label="Descrição"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              margin="dense"
              multiline
              minRows={2}
              label="Observações internas"
              value={form.internalNotes}
              onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" gutterBottom>
              Imagem do produto
            </Typography>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
            {previewUrl && (
              <Box mt={1}>
                <img
                  src={previewUrl}
                  alt="Produto"
                  style={{ maxWidth: 160, maxHeight: 160, objectFit: "contain" }}
                />
              </Box>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button type="button" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="button" color="primary" variant="contained" onClick={handleSave} disabled={loading}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductModal;
