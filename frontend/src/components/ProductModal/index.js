import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@material-ui/core";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

const ProductModal = ({ open, onClose, productId, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    code: "",
    price: "",
    status: "active",
  });

  useEffect(() => {
    if (!open) return;
    if (!productId) {
      setForm({
        name: "",
        description: "",
        category: "",
        code: "",
        price: "",
        status: "active",
      });
      return;
    }
    (async () => {
      try {
        const { data } = await api.get("/products", {
          params: { searchParam: "", pageNumber: 1 },
        });
        const found = (data.products || []).find((p) => p.id === productId);
        if (found) {
          setForm({
            name: found.name || "",
            description: found.description || "",
            category: found.category || "",
            code: found.code || "",
            price: String(found.price ?? ""),
            status: found.status || "active",
          });
        }
      } catch (e) {
        toastError(e);
      }
    })();
  }, [open, productId]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.warning("Informe o nome do produto.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price) || 0,
      };
      if (productId) {
        await api.put(`/products/${productId}`, payload);
        toast.success("Produto atualizado.");
      } else {
        await api.post("/products", payload);
        toast.success("Produto cadastrado.");
      }
      if (onSaved) onSaved();
      onClose();
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{productId ? "Editar produto" : "Novo produto"}</DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          margin="dense"
          label="Nome *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <TextField
          fullWidth
          margin="dense"
          label="Código"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <TextField
          fullWidth
          margin="dense"
          label="Categoria"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
        <TextField
          fullWidth
          margin="dense"
          label="Valor (R$)"
          type="number"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
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
        <TextField
          fullWidth
          margin="dense"
          multiline
          minRows={3}
          label="Descrição"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button color="primary" variant="contained" onClick={handleSave} disabled={loading}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductModal;
