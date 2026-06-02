import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import AddIcon from "@material-ui/icons/Add";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import SearchIcon from "@material-ui/icons/Search";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import HelpHint from "../../components/HelpHint";
import ProductModal from "../../components/ProductModal";
import ProductCategoriesPanel from "../../components/ProductCategoriesPanel";
import ConfirmationModal from "../../components/ConfirmationModal";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/Auth/AuthContext";
import ForbiddenPage from "../../components/ForbiddenPage";
import { unitLabel } from "../../utils/productUnits";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
}));

const fmtBRL = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Products = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState(0);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/products", {
        params: { searchParam: search, status: "all" },
      });
      setProducts(data.products || []);
    } catch (e) {
      toastError(e);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleDelete = async () => {
    try {
      await api.delete(`/products/${deleteId}`);
      toast.success("Produto removido.");
      setDeleteId(null);
      load();
    } catch (e) {
      toastError(e);
    }
  };

  if (user.profile === "user") {
    return <ForbiddenPage />;
  }

  return (
    <MainContainer>
      <ConfirmationModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir produto?"
      >
        Esta ação não pode ser desfeita.
      </ConfirmationModal>
      <ProductModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditId(null);
        }}
        productId={editId}
        onSaved={load}
      />
      <MainHeader>
        <Title>
          Produtos
          <HelpHint areaKey="budgets" />
        </Title>
        {tab === 0 && (
          <MainHeaderButtonsWrapper>
            <TextField
              size="small"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditId(null);
                setModalOpen(true);
              }}
            >
              Novo produto
            </Button>
          </MainHeaderButtonsWrapper>
        )}
      </MainHeader>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} indicatorColor="primary">
        <Tab label="Catálogo" />
        <Tab label="Categorias" />
      </Tabs>

      {tab === 0 ? (
        <Paper className={classes.mainPaper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Unidade</TableCell>
                <TableCell align="right">Venda</TableCell>
                <TableCell align="right">Custo</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.code || "—"}</TableCell>
                  <TableCell>
                    {p.productCategory?.name
                      ? `${p.productCategory.name}${
                          p.productSubcategory?.name
                            ? ` / ${p.productSubcategory.name}`
                            : ""
                        }`
                      : p.category || "—"}
                  </TableCell>
                  <TableCell>{unitLabel(p.unit)}</TableCell>
                  <TableCell align="right">{fmtBRL(p.price)}</TableCell>
                  <TableCell align="right">{fmtBRL(p.costPrice)}</TableCell>
                  <TableCell>{p.status === "active" ? "Ativo" : "Inativo"}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditId(p.id);
                        setModalOpen(true);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setDeleteId(p.id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Box className={classes.mainPaper}>
          <ProductCategoriesPanel />
        </Box>
      )}
    </MainContainer>
  );
};

export default Products;
