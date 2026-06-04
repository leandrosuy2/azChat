import React, { useState, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Typography from "@material-ui/core/Typography";
import Autocomplete, { createFilterOptions } from "@material-ui/lab/Autocomplete";
import CircularProgress from "@material-ui/core/CircularProgress";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import ContactModal from "../ContactModal";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Grid, ListItemText, MenuItem, Select } from "@material-ui/core";
import { toast } from "react-toastify";
import { Facebook, Instagram, WhatsApp } from "@material-ui/icons";
import ShowTicketOpen from "../ShowTicketOpenModal";

const useStyles = makeStyles((theme) => ({
  online: {
    fontSize: 11,
    color: "#25d366"
  },
  offline: {
    fontSize: 11,
    color: "#e1306c"
  }
}));

const filter = createFilterOptions({
  trim: true,
});

/** Mesmo id da coluna «sem etapa» no Kanban (`LANE_EM_ABERTO`). */
const KANBAN_LANE_SEM_ETAPA = "lane0";

/** Número/JID legível (remove @s.whatsapp.net etc.). */
function formatContactNumberForDisplay(raw) {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  const idx = s.indexOf("@");
  if (idx > 0) return s.slice(0, idx);
  return s;
}

const NewTicketModal = ({
  modalOpen,
  onClose,
  initialContact,
  initialPhoneNumber = "",
  quadroGroupId,
  /** Coluna Kanban onde o cartão será criado (id da tag ou `lane0`); só usado com `quadroGroupId`. */
  kanbanLaneId = null,
  /** Chamado após criar cartão no Kanban com «Criar e adicionar outro» — ex.: recarregar lista. */
  onTicketCreated,
}) => {
  const classes = useStyles();
  const [options, setOptions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedQueue, setSelectedQueue] = useState("");
  const [selectedWhatsapp, setSelectedWhatsapp] = useState("");
  const [newContact, setNewContact] = useState({});
  const [whatsapps, setWhatsapps] = useState([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const { user } = useContext(AuthContext);
  const { companyId } = user;

  const [openAlert, setOpenAlert] = useState(false);
  const [userTicketOpen, setUserTicketOpen] = useState("");
  const [queueTicketOpen, setQueueTicketOpen] = useState("");
  const [cardTitle, setCardTitle] = useState("");
  /** Telefone opcional no Kanban: associa ou cria contato ao criar cartão só no quadro. */
  const [phoneInput, setPhoneInput] = useState("");

  const isKanbanArea =
    quadroGroupId != null && quadroGroupId !== "";

  useEffect(() => {
    if (initialContact?.id !== undefined) {
      setOptions([initialContact]);
      setSelectedContact(initialContact);
      if (initialContact.whatsappId != null && initialContact.whatsappId !== "") {
        setSelectedWhatsapp(String(initialContact.whatsappId));
      } else {
        setSelectedWhatsapp("");
      }
    }
  }, [initialContact]);

  useEffect(() => {
    if (!modalOpen || !initialPhoneNumber) return;
    const digits = String(initialPhoneNumber).replace(/\D/g, "");
    setSelectedContact(null);
    setSearchParam(digits);
    setPhoneInput(digits);
    setOptions([]);
  }, [modalOpen, initialPhoneNumber]);

  useEffect(() => {
    if (!modalOpen) return;
    const delayDebounceFn = setTimeout(() => {
      api
        .get(`/whatsapp`, { params: { companyId, session: 0 } })
        .then(({ data }) => setWhatsapps(Array.isArray(data) ? data : []))
        .catch(() => setWhatsapps([]));
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [modalOpen, companyId]);

  useEffect(() => {
    if (!modalOpen || searchParam.length < 3) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        try {
          const { data } = await api.get("contacts", {
            params: { searchParam },
          });
          setOptions(data.contacts);
          setLoading(false);
        } catch (err) {
          setLoading(false);
          toastError(err);
        }
      };
      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, modalOpen]);

  const IconChannel = (channel) => {
    switch (channel) {
      case "facebook":
        return <Facebook style={{ color: "#3b5998", verticalAlign: "middle" }} />;
      case "instagram":
        return <Instagram style={{ color: "#e1306c", verticalAlign: "middle" }} />;
      case "whatsapp":
        return <WhatsApp style={{ color: "#25d366", verticalAlign: "middle" }} />
      default:
        return "error";
    }
  };

  const handleClose = () => {
    onClose();
    setSearchParam("");
    setOpenAlert(false);
    setUserTicketOpen("");
    setQueueTicketOpen("");
    setSelectedContact(null);
    setSelectedQueue("");
    setSelectedWhatsapp("");
    setCardTitle("");
    setPhoneInput("");
  };

  const handleCloseAlert = () => {
    setOpenAlert(false);
    setLoading(false);
    setOpenAlert(false);
    setUserTicketOpen("");
    setQueueTicketOpen("");
  };

  const handleSaveTicket = async (keepOpen = false) => {
    let contactToUse = selectedContact;

    if (!isKanbanArea && !contactToUse?.id && (phoneInput || "").trim()) {
      try {
        const digits = (phoneInput || "").replace(/\D/g, "");
        const nid = await findOrCreateContactForQuadro(
          api,
          phoneInput.trim(),
          digits.length >= 4
            ? `${i18n.t("newTicketModal.whatsappContactPrefix")} ${digits.slice(-4)}`
            : i18n.t("newTicketModal.whatsappContactPrefix")
        );
        if (nid) {
          try {
            const { data: c } = await api.get(`/contacts/${nid}`);
            contactToUse = c;
          } catch {
            contactToUse = { id: nid };
          }
        }
      } catch (err) {
        toastError(err);
        return;
      }
    }

    if (contactToUse?.id) {
      setLoading(true);
      try {
        let queueId =
          selectedQueue !== "" && selectedQueue != null
            ? Number(selectedQueue)
            : null;
        if (
          queueId == null &&
          isKanbanArea &&
          Array.isArray(user.queues) &&
          user.queues.length > 0
        ) {
          const q0 = user.queues[0];
          queueId = Number(
            q0.id != null ? q0.id : q0.UserQueue && q0.UserQueue.queueId
          );
        }
        const payloadWhatsappId =
          selectedWhatsapp !== "" && selectedWhatsapp != null
            ? Number(selectedWhatsapp)
            : null;
        const body = {
          contactId: contactToUse.id,
          queueId,
          whatsappId: payloadWhatsappId,
          userId: user.id,
          status: "open",
          forceNewTicket: true,
        };
        if (isKanbanArea) {
          const n = Number(quadroGroupId);
          if (!Number.isNaN(n) && n > 0) {
            body.quadroGroupId = n;
          }
          const cardTitleTrim = (cardTitle || "").trim();
          if (cardTitleTrim) {
            body.nomeProjeto = cardTitleTrim;
          }
        }
        const { data: ticket } = await api.post("/tickets", body);

        if (keepOpen && isKanbanArea) {
          toast.success("Ticket criado. Você pode criar outro.");
          setCardTitle("");
          setPhoneInput("");
          if (typeof onTicketCreated === "function") onTicketCreated(ticket);
        } else {
          onClose(ticket);
        }
      } catch (err) {
        try {
          const ticket = JSON.parse(err.response?.data?.error);
          if (ticket.userId !== user?.id) {
            setOpenAlert(true);
            setUserTicketOpen(ticket?.user?.name);
            setQueueTicketOpen(ticket?.queue?.name);
          } else {
            setOpenAlert(false);
            setUserTicketOpen("");
            setQueueTicketOpen("");
            if (keepOpen && isKanbanArea) {
              toast.success("Ticket criado. Você pode criar outro.");
              setCardTitle("");
              setPhoneInput("");
              if (typeof onTicketCreated === "function") onTicketCreated(ticket);
            } else {
              onClose(ticket);
            }
          }
        } catch (parseErr) {
          toastError(err);
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isKanbanArea) {
      setLoading(true);
      try {
        const title = (cardTitle || "").trim() || "Novo cartão";
        const laneStr =
          kanbanLaneId != null && String(kanbanLaneId) !== ""
            ? String(kanbanLaneId)
            : "";
        const tagNum =
          laneStr && laneStr !== KANBAN_LANE_SEM_ETAPA
            ? Number(laneStr)
            : NaN;
        let linkedContactId = selectedContact?.id ?? null;
        if (!linkedContactId && (phoneInput || "").trim()) {
          const nid = await findOrCreateContactForQuadro(
            api,
            phoneInput.trim(),
            title
          );
          if (nid) linkedContactId = nid;
        }
        const { data } = await api.post("/standalone-ticket-quadros", {
          nomeProjeto: title,
          quadroGroupId: Number(quadroGroupId),
          kanbanTagId:
            !Number.isNaN(tagNum) && tagNum > 0 ? tagNum : null,
          linkedContactId: linkedContactId || null,
        });
        const created = { standalone: true, ...data };
        if (keepOpen) {
          toast.success("Cartão criado. Adicione outro se quiser.");
          setCardTitle("");
          setPhoneInput("");
          if (typeof onTicketCreated === "function") onTicketCreated(created);
        } else {
          onClose(created);
        }
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    toast.error(i18n.t("newTicketModal.selectContactOrPhone"));
  };

  const handleSelectOption = (e, newValue) => {
    if (newValue?.number) {
      setSelectedContact(newValue);
      if (newValue.whatsappId != null && newValue.whatsappId !== "") {
        setSelectedWhatsapp(String(newValue.whatsappId));
      } else {
        setSelectedWhatsapp("");
      }
    } else if (newValue?.name) {
      setNewContact({ name: newValue.name });
      setContactModalOpen(true);
    }
  };

  const handleCloseContactModal = () => {
    setContactModalOpen(false);
  };

  const handleAddNewContactTicket = contact => {
    setSelectedContact(contact);
  };

  const createAddContactOption = (filterOptions, params) => {
    const filtered = filter(filterOptions, params);
    if (params.inputValue !== "" && !loading && searchParam.length >= 3) {
      filtered.push({
        name: `${params.inputValue}`,
      });
    }
    return filtered;
  };

  const renderOption = option => {
    if (option.number) {
      const numLabel = formatContactNumberForDisplay(option.number);
      return <>
        {IconChannel(option.channel)}
        <Typography component="span" style={{ fontSize: 14, marginLeft: "10px", display: "inline-flex", alignItems: "center", lineHeight: "2" }}>
          {option.name} — {numLabel}
        </Typography>
      </>
    } else {
      return `${i18n.t("newTicketModal.add")} ${option.name}`;
    }
  };

  const renderOptionLabel = option => {
    if (option.number) {
      return `${option.name} — ${formatContactNumberForDisplay(option.number)}`;
    } else {
      return `${option.name}`;
    }
  };

  const renderContactAutocomplete = () => {
    if (isKanbanArea && (initialContact === undefined || initialContact.id === undefined)) {
      return (
        <Grid xs={12} item>
          <Autocomplete
            fullWidth
            options={options}
            loading={loading}
            clearOnBlur
            autoHighlight
            freeSolo
            clearOnEscape
            getOptionLabel={renderOptionLabel}
            renderOption={renderOption}
            filterOptions={createAddContactOption}
            onChange={(e, newValue) => {
              handleSelectOption(e, newValue);
            }}
            renderInput={params => (
              <TextField
                {...params}
                label="Telefone ou nome do cliente (opcional)"
                placeholder="Digite ao menos 3 letras do nome ou parte do número…"
                variant="outlined"
                onChange={e => {
                  setSearchParam(e.target.value);
                  setPhoneInput(e.target.value);
                }}
                onKeyPress={e => {
                  if (loading) return;
                  if (e.key === "Enter" && (selectedContact || isKanbanArea)) {
                    handleSaveTicket();
                  }
                }}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <React.Fragment>
                      {loading ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </React.Fragment>
                  ),
                }}
              />
            )}
          />
        </Grid>
      )
    }
    return null;
  }

  return (
    <>

      <Dialog
        open={modalOpen}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{ style: { minHeight: 520 } }}
      >
        <DialogTitle id="form-dialog-title">
          {i18n.t("newTicketModal.title")}
        </DialogTitle>
        <DialogContent dividers style={{ minHeight: 380 }}>
          <Grid style={{ width: "100%", maxWidth: "100%" }} container spacing={2}>
            {isKanbanArea && (
              <>
                <Grid xs={12} item>
                  <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    label="Título do cartão"
                    placeholder="Opcional — padrão: Novo cartão"
                    value={cardTitle}
                    onChange={(e) => setCardTitle(e.target.value)}
                    autoFocus
                  />
                </Grid>
                <Grid xs={12} item>
                  <Typography variant="caption" color="textSecondary" component="p" style={{ margin: 0 }}>
                    Busque o contato pelo nome ou telefone abaixo. O contato é opcional.
                    Pode criar o cartão só com o título.
                  </Typography>
                </Grid>
              </>
            )}
            {/* CONTATO */}
            {renderContactAutocomplete()}
            {!isKanbanArea && !selectedContact?.id && phoneInput && (
              <Grid xs={12} item>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  label="Número para iniciar conversa"
                  value={phoneInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPhoneInput(value);
                    setSearchParam(value);
                  }}
                  helperText="O sistema vai localizar este número ou criar o vínculo mínimo para abrir o atendimento."
                />
              </Grid>
            )}
            {/* FILA / CONEXÃO: só para tíquete com contato (API /tickets) */}
            {(!isKanbanArea || selectedContact) && (
            <>
            {/* FILA */}
            <Grid xs={12} item>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Fila da mensagem
              </Typography>
              <Select
                fullWidth
                displayEmpty
                variant="outlined"
                value={selectedQueue === "" || selectedQueue == null ? "" : String(selectedQueue)}
                onChange={(e) => {
                  setSelectedQueue(e.target.value);
                }}
                MenuProps={{
                  anchorOrigin: {
                    vertical: "bottom",
                    horizontal: "left",
                  },
                  transformOrigin: {
                    vertical: "top",
                    horizontal: "left",
                  },
                  getContentAnchorEl: null,
                }}
                renderValue={() => {
                  if (selectedQueue === "" || selectedQueue == null) {
                    return "Fila (opcional)";
                  }
                  const queue = user.queues.find(
                    (q) => String(q.id) === String(selectedQueue)
                  );
                  return queue?.name ?? "Fila";
                }}
              >
                <MenuItem dense value="">
                  <em>Sem fila</em>
                </MenuItem>
                {user.queues?.length > 0 &&
                  user.queues.map((queue, key) => (
                    <MenuItem dense key={queue.id} value={String(queue.id)}>
                      <ListItemText primary={queue.name} />
                    </MenuItem>
                  ))
                }
              </Select>
            </Grid>
            {/* CONEXAO */}
            <Grid xs={12} item>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Atendente daquele cliente
              </Typography>
              <Select
                fullWidth
                displayEmpty
                variant="outlined"
                value={selectedWhatsapp === "" || selectedWhatsapp == null ? "" : String(selectedWhatsapp)}
                onChange={(e) => {
                  setSelectedWhatsapp(e.target.value);
                }}
                MenuProps={{
                  anchorOrigin: {
                    vertical: "bottom",
                    horizontal: "left",
                  },
                  transformOrigin: {
                    vertical: "top",
                    horizontal: "left",
                  },
                  getContentAnchorEl: null,
                }}
                renderValue={() => {
                  if (selectedWhatsapp === "" || selectedWhatsapp == null) {
                    return "Conexão WhatsApp (opcional — usa padrão do sistema)";
                  }
                  const wa = whatsapps.find(
                    (w) => String(w.id) === String(selectedWhatsapp)
                  );
                  return wa?.name ?? "Conexão";
                }}
              >
                <MenuItem dense value="">
                  <em>Padrão automático (contato / sistema)</em>
                </MenuItem>
                {whatsapps?.length > 0 &&
                  whatsapps.map((whatsapp, key) => (
                    <MenuItem dense key={whatsapp.id} value={String(whatsapp.id)}>
                      <ListItemText
                        primary={
                          <>
                            {IconChannel(whatsapp.channel)}
                            <Typography component="span" style={{ fontSize: 14, marginLeft: "10px", display: "inline-flex", alignItems: "center", lineHeight: "2" }}>
                              {whatsapp.name} &nbsp; <p className={(whatsapp.status) === 'CONNECTED' ? classes.online : classes.offline} >({whatsapp.status})</p>
                            </Typography>
                          </>
                        }
                      />
                    </MenuItem>
                  ))}
              </Select>
            </Grid>
            </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions style={{ flexWrap: "wrap", gap: 8 }}>
          <Button
            onClick={handleClose}
            color="secondary"
            disabled={loading}
            variant="outlined"
          >
            {i18n.t("newTicketModal.buttons.cancel")}
          </Button>
          {isKanbanArea && (
            <ButtonWithSpinner
              variant="outlined"
              type="button"
              disabled={loading || (!selectedContact && !isKanbanArea)}
              onClick={() => handleSaveTicket(true)}
              color="primary"
              loading={loading}
            >
              Criar e adicionar outro
            </ButtonWithSpinner>
          )}
          <ButtonWithSpinner
            variant="contained"
            type="button"
            disabled={
              loading ||
              (!isKanbanArea && !selectedContact?.id && !(phoneInput || "").trim())
            }
            onClick={() => handleSaveTicket(false)}
            color="primary"
            loading={loading}
          >
            {i18n.t("newTicketModal.buttons.ok")}
          </ButtonWithSpinner>
        </DialogActions>
        {contactModalOpen && (
          <ContactModal
            open={contactModalOpen}
            initialValues={newContact}
            onClose={handleCloseContactModal}
            onSave={handleAddNewContactTicket}
          ></ContactModal>
        )}
        {openAlert && (
          <ShowTicketOpen
            isOpen={openAlert}
            handleClose={handleCloseAlert}
            user={userTicketOpen}
            queue={queueTicketOpen}
          />
        )}
      </Dialog >
    </>
  );
};

/**
 * Busca contato pelo número ou cria um mínimo (nome + dígitos) para vincular ao quadro livre.
 */
async function findOrCreateContactForQuadro(apiClient, phoneRaw, defaultName) {
  const digits = String(phoneRaw || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  try {
    const { data } = await apiClient.get("contacts", {
      params: { searchParam: digits },
    });
    const list = data.contacts || [];
    const hit = list.find(
      (c) => String(c.number || "").replace(/\D/g, "") === digits
    );
    if (hit?.id) return hit.id;
  } catch (e) {
    /* continua para criar */
  }
  try {
    const { data } = await apiClient.post("/contacts", {
      name: defaultName || `Contato ${digits.slice(-4)}`,
      number: digits,
      validateContact: false,
    });
    return data?.id || null;
  } catch (err) {
    try {
      const { data } = await apiClient.get("contacts", {
        params: { searchParam: digits },
      });
      const list = data.contacts || [];
      const hit = list.find(
        (c) => String(c.number || "").replace(/\D/g, "") === digits
      );
      return hit?.id || null;
    } catch (e2) {
      return null;
    }
  }
}

export default NewTicketModal;
