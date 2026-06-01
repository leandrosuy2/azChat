import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, useHistory } from "react-router-dom";
import {
  makeStyles,
  Paper,
  Typography,
  IconButton,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Divider,
  Tooltip,
} from "@material-ui/core";
import ArrowBack from "@material-ui/icons/ArrowBack";
import Edit from "@material-ui/icons/Edit";
import HelpOutline from "@material-ui/icons/HelpOutline";
import Save from "@material-ui/icons/Save";
import DeleteOutline from "@material-ui/icons/DeleteOutline";
import Link from "@material-ui/icons/Link";
import Image from "@material-ui/icons/Image";
import FormatListBulleted from "@material-ui/icons/FormatListBulleted";
import Add from "@material-ui/icons/Add";
import AttachFile from "@material-ui/icons/AttachFile";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
  root: {
    maxWidth: 900,
    margin: "0 auto",
    padding: theme.spacing(2),
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(2),
  },
  backButton: {
    marginRight: theme.spacing(1),
  },
  statusSelect: {
    minWidth: 160,
  },
  coverWrapper: {
    width: "100%",
    maxHeight: 280,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: theme.palette.grey[200],
    marginBottom: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  coverImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  coverPlaceholder: {
    padding: theme.spacing(4),
    color: theme.palette.text.secondary,
    textAlign: "center",
  },
  actionsRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.5),
    marginBottom: theme.spacing(2),
  },
  editorCard: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
    padding: theme.spacing(1, 0),
    borderBottom: "1px solid",
    borderColor: theme.palette.divider,
    marginBottom: theme.spacing(1),
  },
  editorArea: {
    minHeight: 120,
    padding: theme.spacing(2),
    border: "1px solid",
    borderColor: theme.palette.divider,
    borderRadius: 4,
    outline: "none",
    "&:focus": {
      borderColor: theme.palette.primary.main,
    },
    "& ul": { margin: "8px 0", paddingLeft: 24 },
    "& p": { margin: "4px 0" },
  },
  editorButtons: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
    flexWrap: "wrap",
  },
  attachmentsSection: {
    padding: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  attachmentItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(1.5),
    border: "1px solid",
    borderColor: theme.palette.divider,
    borderRadius: 8,
    marginBottom: theme.spacing(1),
  },
  attachmentCapa: {
    fontSize: "0.7rem",
    marginLeft: 8,
    padding: "2px 6px",
    borderRadius: 4,
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
  },
  addAttachmentBtn: {
    marginTop: theme.spacing(1),
  },
  inputFile: {
    display: "none",
  },
}));

const STATUS_OPTIONS = [
  { value: "entregue", label: "Entregue" },
  { value: "em_producao", label: "Em produção" },
  { value: "aguardando", label: "Aguardando" },
  { value: "cancelado", label: "Cancelado" },
];

export default function Quadro() {
  const classes = useStyles();
  const { ticketUuid } = useParams();
  const history = useHistory();
  const { user } = useContext(AuthContext);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [status, setStatus] = useState("aguardando");
  const [coverImage, setCoverImage] = useState(null);
  const [description, setDescription] = useState("PLACA EM PVC ADESIVADA COM FITA DUPLA FACE ATRÁS");
  const [descriptionBackup, setDescriptionBackup] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [attachments, setAttachments] = useState([
    { id: 1, name: "PLACA EM PVC ADESIVADA 100X100", date: "16/02/2026", isCapa: true },
  ]);

  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticketUuid) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/tickets/u/" + ticketUuid);
        setTicket(data);
        setCoverImage(data.contact?.urlPicture || null);
      } catch (err) {
        toast.error("Ticket não encontrado.");
        history.push("/kanban");
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [ticketUuid, history]);

  const handleBack = () => history.push("/kanban");

  const handleEditClick = () => {
    setDescriptionBackup(description);
    setEditMode(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = description;
      }
    }, 0);
  };

  const handleSave = () => {
    if (editorRef.current) {
      setDescription(editorRef.current.innerHTML);
    }
    setEditMode(false);
    toast.success("Descrição salva.");
  };

  const handleDiscard = () => {
    setDescription(descriptionBackup);
    if (editorRef.current) editorRef.current.innerHTML = descriptionBackup;
    setEditMode(false);
    toast.info("Alterações descartadas.");
  };

  const execCmd = (cmd, value = null) => {
    document.execCommand(cmd, false, value);
    if (editorRef.current) editorRef.current.focus();
  };

  const handleInsertImage = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => execCmd("insertImage", reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleInsertLink = () => {
    const url = window.prompt("URL do link:");
    if (url) execCmd("createLink", url);
  };

  const handleAddAttachment = (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const newItems = Array.from(files).map((f, i) => ({
      id: Date.now() + i,
      name: f.name,
      date: new Date().toLocaleDateString("pt-BR"),
      isCapa: attachments.length === 0,
    }));
    setAttachments((prev) => [...prev, ...newItems]);
    toast.success("Arquivo(s) adicionado(s).");
    e.target.value = "";
  };

  const setAsCapa = (id) => {
    setAttachments((prev) =>
      prev.map((a) => ({ ...a, isCapa: a.id === id }))
    );
  };

  if (loading) return <div className={classes.root}>Carregando...</div>;

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <Button startIcon={<ArrowBack />} onClick={handleBack} className={classes.backButton}>
          Voltar
        </Button>
        <FormControl variant="outlined" size="small" className={classes.statusSelect}>
          <InputLabel>Status</InputLabel>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            label="Status"
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>

      <div className={classes.coverWrapper}>
        {coverImage ? (
          <img src={coverImage} alt="Capa" className={classes.coverImage} />
        ) : (
          <Typography className={classes.coverPlaceholder}>
            Imagem de capa (arte do produto)
          </Typography>
        )}
      </div>

      <div className={classes.actionsRow}>
        <Tooltip title="Editar descrição">
          <IconButton size="small" onClick={handleEditClick}>
            <Edit />
          </IconButton>
        </Tooltip>
        <Tooltip title="Ajuda">
          <IconButton size="small">
            <HelpOutline />
          </IconButton>
        </Tooltip>
      </div>

      <Paper elevation={0} className={classes.editorCard}>
        {!editMode ? (
          <Box
            onClick={handleEditClick}
            style={{ cursor: "pointer", minHeight: 60, padding: 16 }}
            dangerouslySetInnerHTML={{ __html: description }}
          />
        ) : (
          <>
            <div className={classes.toolbar}>
              <Tooltip title="Tamanho do texto">
                <Select
                  size="small"
                  value=""
                  displayEmpty
                  style={{ minWidth: 48, height: 32 }}
                  onMouseDown={(e) => e.preventDefault()}
                  onChange={(e) => execCmd("fontSize", e.target.value)}
                >
                  <MenuItem value="1">P</MenuItem>
                  <MenuItem value="3">Tt</MenuItem>
                  <MenuItem value="5">H</MenuItem>
                </Select>
              </Tooltip>
              <IconButton size="small" onClick={() => execCmd("bold")} title="Negrito">
                <Typography style={{ fontWeight: 700 }}>B</Typography>
              </IconButton>
              <IconButton size="small" onClick={() => execCmd("italic")} title="Itálico">
                <Typography style={{ fontStyle: "italic" }}>I</Typography>
              </IconButton>
              <IconButton size="small" onClick={() => execCmd("insertUnorderedList")} title="Lista">
                <FormatListBulleted fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleInsertLink} title="Link">
                <Link fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => imageInputRef.current?.click()} title="Inserir imagem">
                <Image fontSize="small" />
              </IconButton>
              <input
                type="file"
                ref={imageInputRef}
                accept="image/*"
                className={classes.inputFile}
                onChange={handleInsertImage}
              />
              <IconButton size="small" title="Adicionar elemento">
                <Add fontSize="small" />
              </IconButton>
            </div>
            <div
              ref={editorRef}
              className={classes.editorArea}
              contentEditable
              suppressContentEditableWarning
            />
            <div className={classes.editorButtons}>
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<Save />}
                onClick={handleSave}
              >
                Salvar
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DeleteOutline />}
                onClick={handleDiscard}
              >
                Descartar alterações
              </Button>
              <Button size="small" startIcon={<HelpOutline />}>
                Ajuda para formatação
              </Button>
            </div>
          </>
        )}
      </Paper>

      <Paper elevation={0} className={classes.attachmentsSection}>
        <Typography variant="subtitle1" style={{ fontWeight: 600, marginBottom: 16 }}>
          Anexos
        </Typography>
        {attachments.map((att) => (
          <div key={att.id} className={classes.attachmentItem}>
            <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
              <AttachFile fontSize="small" style={{ marginRight: 8, color: "#666" }} />
              <Typography noWrap style={{ flex: 1 }}>
                {att.name}
              </Typography>
              {att.isCapa && <span className={classes.attachmentCapa}>Capa</span>}
            </div>
            <Typography variant="caption" color="textSecondary" style={{ marginRight: 8 }}>
              {att.date}
            </Typography>
            {!att.isCapa && (
              <Button size="small" onClick={() => setAsCapa(att.id)}>
                Marcar como Capa
              </Button>
            )}
          </div>
        ))}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          className={classes.inputFile}
          onChange={handleAddAttachment}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<Add />}
          className={classes.addAttachmentBtn}
          onClick={() => fileInputRef.current?.click()}
        >
          Adicionar
        </Button>
      </Paper>
    </div>
  );
}
