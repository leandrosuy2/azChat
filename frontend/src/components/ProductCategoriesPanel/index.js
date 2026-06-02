import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@material-ui/core";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import AddIcon from "@material-ui/icons/Add";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

const ProductCategoriesPanel = () => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [subNames, setSubNames] = useState({});

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/product-categories");
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      toastError(e);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    try {
      await api.post("/product-categories", { name });
      setNewCategory("");
      toast.success("Categoria criada.");
      load();
    } catch (e) {
      toastError(e);
    }
  };

  const handleAddSubcategory = async (parentId) => {
    const name = (subNames[parentId] || "").trim();
    if (!name) return;
    try {
      await api.post("/product-categories", { name, parentId });
      setSubNames((prev) => ({ ...prev, [parentId]: "" }));
      toast.success("Subcategoria criada.");
      load();
    } catch (e) {
      toastError(e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/product-categories/${id}`);
      toast.success("Removido.");
      load();
    } catch (e) {
      toastError(e);
    }
  };

  return (
    <Box>
      <Box display="flex" gap={1} mb={2} alignItems="center">
        <TextField
          size="small"
          label="Nova categoria"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          fullWidth
        />
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddCategory}
        >
          Adicionar
        </Button>
      </Box>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Categoria</TableCell>
              <TableCell>Subcategorias</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  Nenhuma categoria cadastrada
                </TableCell>
              </TableRow>
            ) : (
              categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <Typography variant="body2" style={{ fontWeight: 600 }}>
                      {cat.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {(cat.children || []).map((sub) => (
                      <Box
                        key={sub.id}
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        mb={0.5}
                      >
                        <Typography variant="body2">{sub.name}</Typography>
                        <IconButton size="small" onClick={() => handleDelete(sub.id)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    <Box display="flex" gap={1} mt={1}>
                      <TextField
                        size="small"
                        placeholder="Nova subcategoria"
                        value={subNames[cat.id] || ""}
                        onChange={(e) =>
                          setSubNames((prev) => ({ ...prev, [cat.id]: e.target.value }))
                        }
                        fullWidth
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleAddSubcategory(cat.id)}
                      >
                        +
                      </Button>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleDelete(cat.id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default ProductCategoriesPanel;
