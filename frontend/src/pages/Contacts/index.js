import React, {
    useState,
    useEffect,
    useReducer,
    useContext,
    useRef,
} from "react";
// import { SocketContext } from "../../context/Socket/SocketContext";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { makeStyles, useTheme, alpha } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import TableContainer from "@material-ui/core/TableContainer";
import TablePagination from "@material-ui/core/TablePagination";
import LinearProgress from "@material-ui/core/LinearProgress";
import Button from "@material-ui/core/Button";
import Avatar from "@material-ui/core/Avatar";
import { Facebook, Instagram, WhatsApp } from "@material-ui/icons";
import SearchIcon from "@material-ui/icons/Search";

import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";

import IconButton from "@material-ui/core/IconButton";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import CancelIcon from "@material-ui/icons/Cancel";
import BlockIcon from "@material-ui/icons/Block";
import WarningRoundedIcon from "@material-ui/icons/WarningRounded";

import api from "../../services/api";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ContactModal from "../../components/ContactModal";
import ConfirmationModal from "../../components/ConfirmationModal";

import { i18n } from "../../translate/i18n";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import MainContainer from "../../components/MainContainer";
import toastError from "../../errors/toastError";
import HelpHint from "../../components/HelpHint";

import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import NewTicketModal from "../../components/NewTicketModal";
import { TagsFilter } from "../../components/TagsFilter";
import PopupState, { bindTrigger, bindMenu } from "material-ui-popup-state";
import { v4 as uuidv4 } from "uuid";

import {
    ArrowDropDown,
    Backup,
    ContactPhone,
    DeleteSweep,
} from "@material-ui/icons";
import { Menu, MenuItem, Box, Checkbox, Tooltip } from "@material-ui/core";

import ContactImportWpModal from "../../components/ContactImportWpModal";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import { TicketsContext } from "../../context/Tickets/TicketsContext";

// Phone number validation and formatting functions
const isValidBrazilianPhoneNumber = (number) => {
  if (!number) return false;

  // Remove all non-numeric characters
  const cleanNumber = number.replace(/\D/g, '');

  // Check if the number is empty or too short
  if (!cleanNumber || cleanNumber.length < 10) return false;

  // Brazilian numbers typically have 10-11 digits (with area code)
  // DDD (area code) in Brazil is 2 digits (11-99)
  if (cleanNumber.length > 13) return false;

  // Check if starts with country code 55 (Brazil) or has valid area code
  const hasBrazilCountryCode = cleanNumber.startsWith('55');
  const numberWithoutCountryCode = hasBrazilCountryCode ? cleanNumber.slice(2) : cleanNumber;

  // Extract area code (DDD)
  const areaCode = numberWithoutCountryCode.slice(0, 2);

  // Validate the area code (Brazilian DDDs range from 11 to 99)
  const areaCodeNum = parseInt(areaCode, 10);
  if (areaCodeNum < 11 || areaCodeNum > 99) return false;

  // Check the length of the remaining phone number
  const phoneNumberWithoutAreaCode = numberWithoutCountryCode.slice(2);

  // Brazilian mobile numbers have 9 digits, landlines have 8
  const isValidLength = phoneNumberWithoutAreaCode.length === 8 || phoneNumberWithoutAreaCode.length === 9;

  // Mobile numbers in Brazil start with 9
  const isMobileValid = phoneNumberWithoutAreaCode.length === 9 && phoneNumberWithoutAreaCode.startsWith('9');

  // Landline numbers should have 8 digits
  const isLandlineValid = phoneNumberWithoutAreaCode.length === 8;

  return isValidLength && (isMobileValid || isLandlineValid);
};

// Function to format the Brazilian phone number for display
const formatBrazilianPhoneNumber = (number) => {
  if (!isValidBrazilianPhoneNumber(number)) return null;

  // Remove all non-numeric characters
  const cleanNumber = number.replace(/\D/g, '');

  // Handle numbers with country code
  const hasBrazilCountryCode = cleanNumber.startsWith('55');
  const numberWithoutCountryCode = hasBrazilCountryCode ? cleanNumber.slice(2) : cleanNumber;

  // Get area code
  const areaCode = numberWithoutCountryCode.slice(0, 2);

  // Get the phone part
  const phoneNumber = numberWithoutCountryCode.slice(2);

  // Format based on mobile (9 digits) or landline (8 digits)
  if (phoneNumber.length === 9) {
    // Mobile format: (XX) 9XXXX-XXXX
    return `🇧🇷 (${areaCode}) ${phoneNumber.slice(0, 1)}${phoneNumber.slice(1, 5)}-${phoneNumber.slice(5)}`;
  } else {
    // Landline format: (XX) XXXX-XXXX
    return `🇧🇷 (${areaCode}) ${phoneNumber.slice(0, 4)}-${phoneNumber.slice(4)}`;
  }
};

// Format phone number with LGPD masking when needed
const formatPhoneNumber = (number, isGroup, shouldHide = false, userProfile = "") => {
  // Handle group numbers differently
  if (isGroup) return number;

  // Check if it's a valid Brazilian phone number
  const isValidBrNumber = isValidBrazilianPhoneNumber(number);

  // If not valid, return null instead of a warning message
  if (!isValidBrNumber) return null;

  // If LGPD is enabled and number should be hidden for user profile
  if (shouldHide && userProfile === "user") {
    const formattedNumber = formatBrazilianPhoneNumber(number);
    if (!formattedNumber) return null;

    // Ensure proper masking of the phone number
    const parts = formattedNumber.split(' ');
    if (parts.length >= 3) {
      const lastPart = parts[parts.length - 1];
      const [firstHalf, secondHalf] = lastPart.split('-');
      return `🇧🇷 ${parts[1]} ${firstHalf.slice(0, -2)}**-**${secondHalf.slice(-2)}`;
    }
    return formattedNumber;
  }

  // Return properly formatted Brazilian phone number
  return formatBrazilianPhoneNumber(number) || null;
};

const digitsOnlyStr = (s) => String(s || "").replace(/\D/g, "");

/** Agrupa dígitos longos (LID / IDs) para leitura humana. */
const groupLongDigitsForDisplay = (d) => {
  if (!d || d.length < 12) return null;
  const chunks = d.match(/.{1,4}/g);
  return chunks ? chunks.join(" ") : d;
};

const displayContactNameForList = (contact) => {
  const visible = (contact.name || "").trim();
  if (!visible) return i18n.t("contacts.table.unnamed");
  const onlyDigits = /^\d+$/.test(visible.replace(/\s/g, ""));
  if (onlyDigits) return i18n.t("contacts.table.unnamed");
  return visible;
};

/** Retorna tooltip descritivo se o contato está sem nome e/ou sem número real. */
const getMissingFieldsWarning = (contact, isLid) => {
  const noName = !contact.name || /^\d+$/.test((contact.name || "").replace(/\s/g, ""));
  const noNumber = isLid || !contact.number || digitsOnlyStr(contact.number).length < 8;
  if (noName && noNumber) return "Sem nome e sem número de telefone cadastrados";
  if (noName) return "Sem nome cadastrado";
  if (noNumber) return "Sem número de telefone cadastrado";
  return null;
};

/**
 * Retorna true se o número armazenado parece ser um LID do WhatsApp (ID interno,
 * não um número de telefone real). Critérios espelhados de resolveContactWhatsAppPhone.js.
 */
const isLidNumber = (stored, remoteJid) => {
  if (/@lid$/i.test(remoteJid || "")) return true;
  // Fallback: número ainda não migrado (LID salvo como dígitos antes da correção do backend)
  if (!stored) return false;
  const s = String(stored);
  if (s.length >= 14 && s.length <= 16 && /^1\d+$/.test(s)) return true;
  return false;
};

/**
 * Retorna { display, title } para a célula de número.
 * display: texto curto para exibir; title: tooltip (undefined se igual ao display).
 */
const displayContactNumberForList = (raw, isGroup, shouldHide, userProfile, remoteJid) => {
  if (isGroup) return { display: raw || "—", title: undefined };
  if (raw == null || raw === "") return { display: "—", title: undefined };
  const jid = String(raw).split("@")[0];
  const d = jid.replace(/\D/g, "");

  // LID: ID interno do WhatsApp, não é telefone real
  if (isLidNumber(d, remoteJid)) {
    return {
      display: "—",
      title: i18n.t("contacts.table.lidNumber", { defaultValue: "Número não disponível (ID interno WhatsApp)" }),
    };
  }

  const br = formatPhoneNumber(jid, false, shouldHide, userProfile);
  if (br) return { display: br, title: undefined };
  if (!d) return { display: jid, title: undefined };
  if (shouldHide && userProfile === "user" && d.length >= 4) {
    return { display: `•••• ${d.slice(-4)}`, title: undefined };
  }
  const grouped = groupLongDigitsForDisplay(d);
  if (grouped) return { display: `+${grouped}`, title: undefined };
  if (jid.trim().startsWith("+")) return { display: jid, title: undefined };
  const text = d.length >= 8 ? `+${d}` : jid;
  return { display: text, title: undefined };
};

const reducer = (state, action) => {
    if (action.type === "SET_CONTACTS") {
        return Array.isArray(action.payload) ? [...action.payload] : [];
    }

    if (action.type === "UPDATE_CONTACTS") {
        const contact = action.payload;
        const contactIndex = state.findIndex((c) => c.id === contact.id);

        if (contactIndex !== -1) {
            state[contactIndex] = contact;
            return [...state];
        } else {
            return [contact, ...state];
        }
    }

    if (action.type === "DELETE_CONTACT") {
        const contactId = action.payload;

        const contactIndex = state.findIndex((c) => c.id === contactId);
        if (contactIndex !== -1) {
            state.splice(contactIndex, 1);
        }
        return [...state];
    }

    if (action.type === "RESET") {
        return [];
    }
};

const useStyles = makeStyles((theme) => ({
    mainContainer: {
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        flex: 1,
    },
    filtersBar: {
        flexShrink: 0,
        padding: theme.spacing(1, 1.5),
        marginBottom: theme.spacing(1),
        borderRadius: theme.spacing(1),
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor:
            theme.palette.type === "dark"
                ? theme.palette.grey[900]
                : theme.palette.grey[50],
        boxShadow:
            theme.palette.type === "dark"
                ? "none"
                : `0 1px 3px ${alpha(theme.palette.common.black, 0.06)}`,
    },
    listCard: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        borderRadius: theme.spacing(1),
        overflow: "hidden",
        padding: 0,
    },
    tableInner: {
        padding: theme.spacing(0, 1),
    },
    tableScroll: {
        flex: 1,
        minHeight: 200,
        maxHeight: "calc(100vh - 260px)",
        overflow: "auto",
        ...theme.scrollbarStyles,
    },
    topProgress: {
        height: 3,
    },
    paginationWrap: {
        flexShrink: 0,
        borderTop: `1px solid ${theme.palette.divider}`,
        backgroundColor:
            theme.palette.type === "dark"
                ? alpha(theme.palette.common.white, 0.04)
                : alpha(theme.palette.common.black, 0.02),
    },
    paginationToolbar: {
        minHeight: 48,
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(1),
    },
    tableHeadCell: {
        fontWeight: 600,
        fontSize: "0.8125rem",
        backgroundColor:
            theme.palette.type === "dark"
                ? alpha(theme.palette.common.white, 0.04)
                : alpha(theme.palette.common.black, 0.03),
    },
}));

const Contacts = () => {
    const classes = useStyles();
    const theme = useTheme();
    const history = useHistory();

    //   const socketManager = useContext(SocketContext);
    const { user, socket } = useContext(AuthContext);

    const [loading, setLoading] = useState(false);
    const [pageNumber, setPageNumber] = useState(1);
    const [searchParam, setSearchParam] = useState("");
    const [contacts, dispatch] = useReducer(reducer, []);
    const [selectedContactId, setSelectedContactId] = useState(null);
    const [contactModalOpen, setContactModalOpen] = useState(false);

    const [importContactModalOpen, setImportContactModalOpen] = useState(false);
    const [deletingContact, setDeletingContact] = useState(null);
    const [ImportContacts, setImportContacts] = useState(null);
    const [blockingContact, setBlockingContact] = useState(null);
    const [unBlockingContact, setUnBlockingContact] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [exportContact, setExportContact] = useState(false);
    const [confirmChatsOpen, setConfirmChatsOpen] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [listRefreshTick, setListRefreshTick] = useState(0);
    const [selectedContactIds, setSelectedContactIds] = useState({});
    const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
    const [bulkDeleteMode, setBulkDeleteMode] = useState(null);
    const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
    const [contactTicket, setContactTicket] = useState({});
    const fileUploadRef = useRef(null);
    const [selectedTags, setSelectedTags] = useState([]);
    const { setCurrentTicket } = useContext(TicketsContext);

    const { getAll: getAllSettings } = useCompanySettings();
    const [hideNum, setHideNum] = useState(false);
    const [enableLGPD, setEnableLGPD] = useState(false);
    useEffect(() => {

        async function fetchData() {

            const settingList = await getAllSettings(user.companyId);

            for (const [key, value] of Object.entries(settingList)) {

                if (key === "enableLGPD") setEnableLGPD(value === "enabled");
                if (key === "lgpdHideNumber") setHideNum(value === "enabled");

              }
        }
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleImportExcel = async () => {
        try {
            const formData = new FormData();
            formData.append("file", fileUploadRef.current.files[0]);
            await api.request({
                url: `/contacts/upload`,
                method: "POST",
                data: formData,
            });
            toast.success(i18n.t("contacts.toasts.importExcelSuccess"));
            setListRefreshTick((t) => t + 1);
            setPageNumber(1);
            if (fileUploadRef.current) fileUploadRef.current.value = "";
        } catch (err) {
            toastError(err);
        }
    };

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchParam), 450);
        return () => clearTimeout(t);
    }, [searchParam]);

    useEffect(() => {
        setPageNumber(1);
    }, [debouncedSearch, selectedTags]);

    useEffect(() => {
        setSelectedContactIds({});
    }, [debouncedSearch, selectedTags, pageNumber, rowsPerPage]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const fetchContacts = async () => {
            try {
                const { data } = await api.get("/contacts/", {
                    params: {
                        searchParam: debouncedSearch,
                        pageNumber,
                        limit: rowsPerPage,
                        contactTag: JSON.stringify(selectedTags),
                    },
                });
                if (cancelled) return;
                dispatch({ type: "SET_CONTACTS", payload: data.contacts });
                setTotalCount(typeof data.count === "number" ? data.count : 0);
            } catch (err) {
                if (!cancelled) toastError(err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchContacts();
        return () => {
            cancelled = true;
        };
    }, [debouncedSearch, pageNumber, selectedTags, rowsPerPage, listRefreshTick]);

    useEffect(() => {
        const companyId = user.companyId;
        //    const socket = socketManager.GetSocket();

        const onContactEvent = (data) => {
            if (data.action === "update" || data.action === "create") {
                dispatch({ type: "UPDATE_CONTACTS", payload: data.contact });
            }

            if (data.action === "delete") {
                dispatch({ type: "DELETE_CONTACT", payload: +data.contactId });
            }

            if (data.action === "bulk-delete") {
                setListRefreshTick((t) => t + 1);
            }
        };
        socket.on(`company-${companyId}-contact`, onContactEvent);

        return () => {
            socket.off(`company-${companyId}-contact`, onContactEvent);
        };
    }, [socket, user.companyId]);

    const handleSelectTicket = (ticket) => {
        const code = uuidv4();
        const { id, uuid } = ticket;
        setCurrentTicket({ id, uuid, code });
    }

    const handleCloseOrOpenTicket = (ticket) => {
        setNewTicketModalOpen(false);
        if (ticket !== undefined && ticket.uuid !== undefined) {
            handleSelectTicket(ticket);
            history.push(`/tickets/${ticket.uuid}`);
        }
    };

    const handleSelectedTags = (selecteds) => {
        const tags = selecteds.map((t) => t.id);
        setSelectedTags(tags);
    };

    const handleSearch = (event) => {
        setSearchParam(event.target.value.toLowerCase());
    };

    const handleOpenContactModal = () => {
        setSelectedContactId(null);
        setContactModalOpen(true);
    };

    const handleCloseContactModal = () => {
        setSelectedContactId(null);
        setContactModalOpen(false);
    };

    const hadleEditContact = (contactId) => {
        setSelectedContactId(contactId);
        setContactModalOpen(true);
    };

    const handleDeleteContact = async (contactId) => {
        try {
            await api.delete(`/contacts/${contactId}`);
            toast.success(i18n.t("contacts.toasts.deleted"));
        } catch (err) {
            toastError(err);
        }
        setDeletingContact(null);
        setSearchParam("");
        setPageNumber(1);
    };

    const handleBlockContact = async (contactId) => {
        try {
            await api.put(`/contacts/block/${contactId}`, { active: false });
            toast.success("Contato bloqueado");
        } catch (err) {
            toastError(err);
        }
        setDeletingContact(null);
        setSearchParam("");
        setPageNumber(1);
        setBlockingContact(null);
    };

    const handleUnBlockContact = async (contactId) => {
        try {
            await api.put(`/contacts/block/${contactId}`, { active: true });
            toast.success("Contato desbloqueado");
        } catch (err) {
            toastError(err);
        }
        setDeletingContact(null);
        setSearchParam("");
        setPageNumber(1);
        setUnBlockingContact(null);
    };

    const handleimportContact = async () => {
        const payload = { companyId: user?.companyId };
        // eslint-disable-next-line no-console
        console.log("[Contatos] Importar do aparelho — clique; enviando POST /contacts/import", {
            payload,
            userId: user?.id,
            companyId: user?.companyId,
        });
        try {
            const { data, status, statusText } = await api.post(
                "/contacts/import",
                payload
            );
            // eslint-disable-next-line no-console
            console.log("[Contatos] Importar do aparelho — resposta OK:", {
                status,
                statusText,
                data,
                raw: JSON.stringify(data),
            });
            toast.success(i18n.t("contacts.toasts.importFromPhone"));
            setImportContacts(false);
            setListRefreshTick((t) => t + 1);
            setPageNumber(1);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error("[Contatos] Importar do aparelho — erro:", {
                message: err?.message,
                responseStatus: err?.response?.status,
                responseData: err?.response?.data,
                responseHeaders: err?.response?.headers,
                full: err,
            });
            toastError(err);
            setImportContacts(false);
        }
    };

    const handleimportChats = async () => {
        try {
            await api.post("/contacts/import/chats", { companyId: user?.companyId });
            toast.success(i18n.t("contacts.toasts.importChatsRequested"));
            setListRefreshTick((t) => t + 1);
            setPageNumber(1);
        } catch (err) {
            toastError(err);
        }
    };

    const handleChangePage = (event, newPage) => {
        setPageNumber(newPage + 1);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPageNumber(1);
    };

    const selectedCount = Object.keys(selectedContactIds).filter(
        (k) => selectedContactIds[k]
    ).length;

    const allOnPageSelected =
        contacts.length > 0 &&
        contacts.every((c) => selectedContactIds[c.id]);
    const someOnPageSelected = contacts.some((c) => selectedContactIds[c.id]);

    const toggleSelectContact = (id) => {
        setSelectedContactIds((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const toggleSelectAllOnPage = () => {
        if (allOnPageSelected) {
            const next = { ...selectedContactIds };
            contacts.forEach((c) => {
                delete next[c.id];
            });
            setSelectedContactIds(next);
        } else {
            const next = { ...selectedContactIds };
            contacts.forEach((c) => {
                next[c.id] = true;
            });
            setSelectedContactIds(next);
        }
    };

    const openBulkConfirm = (mode, popupState) => {
        setBulkDeleteMode(mode);
        setBulkConfirmOpen(true);
        if (popupState?.close) popupState.close();
    };

    const handleBulkDeleteConfirm = async () => {
        try {
            let payload = {};
            if (bulkDeleteMode === "selected") {
                const ids = Object.keys(selectedContactIds)
                    .filter((k) => selectedContactIds[k])
                    .map((k) => Number(k));
                if (!ids.length) {
                    toast.warn(i18n.t("contacts.bulkDelete.noSelection"));
                    return;
                }
                payload = { ids };
            } else if (bulkDeleteMode === "filtered") {
                payload = {
                    deleteFiltered: true,
                    searchParam: debouncedSearch,
                    contactTag: JSON.stringify(selectedTags),
                };
            } else if (bulkDeleteMode === "all") {
                payload = { deleteEntireCompany: true };
            }
            const { data } = await api.post("/contacts/bulk-delete", payload);
            toast.success(
                i18n.t("contacts.toasts.bulkDeleted", {
                    count: data.deleted ?? 0,
                })
            );
            setBulkConfirmOpen(false);
            setBulkDeleteMode(null);
            setSelectedContactIds({});
            setListRefreshTick((t) => t + 1);
            setPageNumber(1);
        } catch (err) {
            toastError(err);
        }
    };

    const bulkConfirmTitle =
        bulkDeleteMode === "selected"
            ? i18n.t("contacts.bulkDelete.confirmSelectedTitle")
            : bulkDeleteMode === "filtered"
                ? i18n.t("contacts.bulkDelete.confirmFilteredTitle")
                : i18n.t("contacts.bulkDelete.confirmAllTitle");

    const bulkConfirmBody =
        bulkDeleteMode === "selected"
            ? i18n.t("contacts.bulkDelete.confirmSelected", {
                  count: selectedCount,
              })
            : bulkDeleteMode === "filtered"
                ? i18n.t("contacts.bulkDelete.confirmFiltered", {
                      count: totalCount,
                  })
                : i18n.t("contacts.bulkDelete.confirmAll", {
                      count: totalCount,
                  });

    return (
        <MainContainer className={classes.mainContainer}>
            <NewTicketModal
                modalOpen={newTicketModalOpen}
                initialContact={contactTicket}
                onClose={(ticket) => {
                    handleCloseOrOpenTicket(ticket);
                }}
            />
            <ContactModal
                open={contactModalOpen}
                onClose={handleCloseContactModal}
                aria-labelledby="form-dialog-title"
                contactId={selectedContactId}
            ></ContactModal>
            <ConfirmationModal
                title={
                    deletingContact
                        ? `${i18n.t(
                            "contacts.confirmationModal.deleteTitle"
                        )} ${deletingContact.name}?`
                        : blockingContact
                            ? `Bloquear Contato ${blockingContact.name}?`
                            : unBlockingContact
                                ? `Desbloquear Contato ${unBlockingContact.name}?`
                                : ImportContacts
                                    ? `${i18n.t("contacts.confirmationModal.importTitlte")}`
                                    : `${i18n.t("contactListItems.confirmationModal.importTitlte")}`
                }
                open={confirmOpen}
                onClose={setConfirmOpen}
                onConfirm={(e) =>
                    deletingContact
                        ? handleDeleteContact(deletingContact.id)
                        : blockingContact
                            ? handleBlockContact(blockingContact.id)
                            : unBlockingContact
                                ? handleUnBlockContact(unBlockingContact.id)
                                : ImportContacts
                                    ? handleimportContact()
                                    : handleImportExcel()
                }
            >
                {exportContact
                    ?
                    `${i18n.t("contacts.confirmationModal.exportContact")}`
                    : deletingContact
                        ? `${i18n.t("contacts.confirmationModal.deleteMessage")}`
                        : blockingContact
                            ? `${i18n.t("contacts.confirmationModal.blockContact")}`
                            : unBlockingContact
                                ? `${i18n.t("contacts.confirmationModal.unblockContact")}`
                                : ImportContacts
                                    ? `${i18n.t("contacts.confirmationModal.importMessage")}`
                                    : `${i18n.t(
                                        "contactListItems.confirmationModal.importMessage"
                                    )}`}
            </ConfirmationModal>
            <ConfirmationModal
                title={i18n.t("contacts.confirmationModal.importChat")}
                open={confirmChatsOpen}
                onClose={setConfirmChatsOpen}
                onConfirm={(e) => handleimportChats()}
            >
                {i18n.t("contacts.confirmationModal.wantImport")}
            </ConfirmationModal>
            <ConfirmationModal
                title={bulkConfirmTitle}
                open={bulkConfirmOpen}
                onClose={() => {
                    setBulkConfirmOpen(false);
                    setBulkDeleteMode(null);
                }}
                onConfirm={handleBulkDeleteConfirm}
            >
                {bulkConfirmBody}
            </ConfirmationModal>
            <MainHeader>
                <span style={{ display: "flex", alignItems: "center" }}>
                    <Title>
                        {i18n.t("contacts.title")} ({totalCount})
                    </Title>
                    <HelpHint areaKey="contacts" />
                </span>
                <MainHeaderButtonsWrapper>
                    <Box
                        className={classes.filtersBar}
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: theme.spacing(1),
                        }}
                    >
                    <TagsFilter
                        onFiltered={handleSelectedTags}
                    />
                    <TextField
                        placeholder={i18n.t("contacts.searchPlaceholder")}
                        type="search"
                        variant="outlined"
                        size="small"
                        value={searchParam}
                        onChange={handleSearch}
                        style={{ minWidth: 200, flex: "1 1 200px" }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon style={{ color: theme.palette.text.secondary }} />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <PopupState variant="popover" popupId="demo-popup-menu">
                        {(popupState) => (
                            <React.Fragment>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    {...bindTrigger(popupState)}
                                >
                                    Importar / Exportar
                                    <ArrowDropDown />
                                </Button>
                                <Menu {...bindMenu(popupState)}>
                                    <MenuItem
                                        onClick={() => {
                                            setConfirmOpen(true);
                                            setImportContacts(true);
                                            popupState.close();
                                        }}
                                    >
                                        <ContactPhone
                                            fontSize="small"
                                            color="primary"
                                            style={{
                                                marginRight: 10,
                                            }}
                                        />
                                        {i18n.t("contacts.menu.importYourPhone")}
                                    </MenuItem>
                                    <MenuItem
                                        onClick={() => { setImportContactModalOpen(true) }}

                                    >
                                        <Backup
                                            fontSize="small"
                                            color="primary"
                                            style={{
                                                marginRight: 10,
                                            }}
                                        />
                                        {i18n.t("contacts.menu.importToExcel")}

                                    </MenuItem>
                                </Menu>
                            </React.Fragment>
                        )}
                    </PopupState>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleOpenContactModal}
                    >
                        {i18n.t("contacts.buttons.add")}
                    </Button>
                    <Can
                        role={user.profile}
                        perform="contacts-page:deleteContact"
                        yes={() => (
                            <PopupState variant="popover" popupId="contacts-bulk-delete">
                                {(popupState) => (
                                    <React.Fragment>
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            startIcon={<DeleteSweep />}
                                            {...bindTrigger(popupState)}
                                        >
                                            {i18n.t("contacts.bulkDelete.menu")}
                                        </Button>
                                        <Menu {...bindMenu(popupState)}>
                                            <MenuItem
                                                disabled={!selectedCount}
                                                onClick={() =>
                                                    openBulkConfirm("selected", popupState)
                                                }
                                            >
                                                {i18n.t("contacts.bulkDelete.deleteSelected")}
                                            </MenuItem>
                                            <MenuItem
                                                disabled={totalCount === 0}
                                                onClick={() =>
                                                    openBulkConfirm("filtered", popupState)
                                                }
                                            >
                                                {i18n.t(
                                                    "contacts.bulkDelete.deleteFiltered",
                                                    { count: totalCount }
                                                )}
                                            </MenuItem>
                                            <MenuItem
                                                disabled={totalCount === 0}
                                                onClick={() =>
                                                    openBulkConfirm("all", popupState)
                                                }
                                            >
                                                {i18n.t(
                                                    "contacts.bulkDelete.deleteAllCompany"
                                                )}
                                            </MenuItem>
                                        </Menu>
                                    </React.Fragment>
                                )}
                            </PopupState>
                        )}
                    />
                    </Box>
                </MainHeaderButtonsWrapper>
            </MainHeader>

            {importContactModalOpen && (
                <ContactImportWpModal
                    isOpen={importContactModalOpen}
                    handleClose={() => setImportContactModalOpen(false)}
                    selectedTags={selectedTags}
                    hideNum={hideNum}
                    userProfile={user.profile}
                />
            )}
            <Paper className={classes.listCard} variant="outlined">
                <input
                    style={{ display: "none" }}
                    id="upload"
                    name="file"
                    type="file"
                    accept=".xls,.xlsx"
                    onChange={() => {
                        setConfirmOpen(true);
                    }}
                    ref={fileUploadRef}
                />
                {loading && (
                    <LinearProgress
                        color="primary"
                        className={classes.topProgress}
                    />
                )}
                <TableContainer className={classes.tableScroll}>
                    <Table size="small" className={classes.tableInner}>
                    <TableHead>
                        <TableRow>
                            <TableCell
                                padding="checkbox"
                                className={classes.tableHeadCell}
                                align="center"
                            >
                                <Can
                                    role={user.profile}
                                    perform="contacts-page:deleteContact"
                                    yes={() => (
                                        <Checkbox
                                            size="small"
                                            color="primary"
                                            indeterminate={
                                                someOnPageSelected && !allOnPageSelected
                                            }
                                            checked={allOnPageSelected}
                                            onChange={toggleSelectAllOnPage}
                                            inputProps={{
                                                "aria-label": i18n.t(
                                                    "contacts.bulkDelete.selectPage"
                                                ),
                                            }}
                                        />
                                    )}
                                />
                            </TableCell>
                            <TableCell className={classes.tableHeadCell}>
                                {i18n.t("contacts.table.name")}
                            </TableCell>
                            <TableCell align="center" className={classes.tableHeadCell}>
                                {i18n.t("contacts.table.phone")}
                            </TableCell>
                            <TableCell align="center" className={classes.tableHeadCell}>
                                {i18n.t("contacts.table.email")}
                            </TableCell>
                            <TableCell align="center" className={classes.tableHeadCell}>
                                {i18n.t("contacts.table.whatsapp")}
                            </TableCell>
                            <TableCell align="center" className={classes.tableHeadCell}>{"Status"}</TableCell>
                            <TableCell align="center" className={classes.tableHeadCell}>
                                {i18n.t("contacts.table.actions")}
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <>
                            {contacts.map((contact) => {
                                const { display: displayNumber, title: displayNumberTitle } = displayContactNumberForList(
                                    contact.number,
                                    contact.isGroup,
                                    enableLGPD && hideNum,
                                    user.profile,
                                    contact.remoteJid
                                );
                                const rawName = (contact.name || "").trim();
                                const displayName = displayContactNameForList(contact);
                                const digits = String(contact.number || "").replace(/\D/g, "");
                                const fullNumberTitle = contact.isGroup
                                    ? contact.number
                                    : digitsOnlyStr(contact.number);
                                const missingWarning = getMissingFieldsWarning(contact, displayNumberTitle != null);
                                return (
                                    <TableRow key={contact.id}>
                                        <TableCell
                                            align="center"
                                            style={{ paddingRight: 4, width: 96 }}
                                        >
                                            <Box
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                            >
                                                <Can
                                                    role={user.profile}
                                                    perform="contacts-page:deleteContact"
                                                    yes={() => (
                                                        <Checkbox
                                                            size="small"
                                                            color="primary"
                                                            style={{ marginRight: 4 }}
                                                            checked={!!selectedContactIds[contact.id]}
                                                            onChange={() =>
                                                                toggleSelectContact(contact.id)
                                                            }
                                                        />
                                                    )}
                                                />
                                                <Avatar src={`${contact?.urlPicture}`} />
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" style={{ gap: 6 }}>
                                                {displayName}
                                                {missingWarning && (
                                                    <Tooltip title={missingWarning} arrow>
                                                        <WarningRoundedIcon
                                                            style={{ fontSize: 16, color: "#f59e0b", flexShrink: 0 }}
                                                        />
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center" title={displayNumberTitle || fullNumberTitle || undefined}>
                                            {displayNumber}
                                        </TableCell>
                                        <TableCell align="center">
                                            {contact.email}
                                        </TableCell>
                                        <TableCell>{contact?.whatsapp?.name}</TableCell>
                                        <TableCell align="center">
                                            {contact.active ? (
                                                <CheckCircleIcon
                                                    style={{ color: "green" }}
                                                    fontSize="small"
                                                />
                                            ) : (
                                                <CancelIcon
                                                    style={{ color: "red" }}
                                                    fontSize="small"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton
                                                size="small"
                                                disabled={!contact.active || digits.length < 10}
                                                onClick={() => {
                                                    setContactTicket(contact);
                                                    setNewTicketModalOpen(true);
                                                }}
                                            >
                                                {contact.channel === "whatsapp" && (<WhatsApp style={{ color: "green" }} />)}
                                                {contact.channel === "instagram" && (<Instagram style={{ color: "purple" }} />)}
                                                {contact.channel === "facebook" && (<Facebook style={{ color: "blue" }} />)}
                                            </IconButton>

                                            <IconButton
                                                size="small"
                                                onClick={() =>
                                                    hadleEditContact(contact.id)
                                                }
                                            >
                                                <EditIcon color="secondary" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={
                                                    contact.active
                                                        ? () => {
                                                            setConfirmOpen(true);
                                                            setBlockingContact(
                                                                contact
                                                            );
                                                        }
                                                        : () => {
                                                            setConfirmOpen(true);
                                                            setUnBlockingContact(
                                                                contact
                                                            );
                                                        }
                                                }
                                            >
                                                {contact.active ? (
                                                    <BlockIcon color="secondary" />
                                                ) : (
                                                    <CheckCircleIcon color="secondary" />
                                                )}
                                            </IconButton>
                                            <Can
                                                role={user.profile}
                                                perform="contacts-page:deleteContact"
                                                yes={() => (
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            setConfirmOpen(true);
                                                            setDeletingContact(
                                                                contact
                                                            );
                                                        }}
                                                    >
                                                        <DeleteOutlineIcon color="secondary" />
                                                    </IconButton>
                                                )}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {loading && contacts.length === 0 && (
                                <TableRowSkeleton avatar columns={6} />
                            )}
                        </>
                    </TableBody>
                </Table>
                </TableContainer>
                <div className={classes.paginationWrap}>
                    <TablePagination
                        component="div"
                        count={totalCount}
                        page={Math.max(0, pageNumber - 1)}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        labelRowsPerPage={i18n.t(
                            "contacts.pagination.rowsPerPage"
                        )}
                        labelDisplayedRows={({ from, to, count }) =>
                            count === -1
                                ? i18n.t(
                                      "contacts.pagination.displayedRowsUnknown",
                                      { from, to }
                                  )
                                : i18n.t("contacts.pagination.displayedRows", {
                                      from,
                                      to,
                                      count,
                                  })
                        }
                        classes={{ toolbar: classes.paginationToolbar }}
                    />
                </div>
            </Paper>
        </MainContainer >
    );
};

export default Contacts;
