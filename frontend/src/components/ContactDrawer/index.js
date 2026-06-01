import React, { useEffect, useLayoutEffect, useState, useContext, useCallback, useMemo, useRef } from "react";
import { useHistory } from "react-router-dom";

import { makeStyles, alpha } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Drawer from "@material-ui/core/Drawer";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import TextField from "@material-ui/core/TextField";
import Avatar from "@material-ui/core/Avatar";
import Divider from "@material-ui/core/Divider";
import Tooltip from "@material-ui/core/Tooltip";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";
import FormControl from "@material-ui/core/FormControl";
import Box from "@material-ui/core/Box";
import InputAdornment from "@material-ui/core/InputAdornment";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Collapse from "@material-ui/core/Collapse";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import CircularProgress from "@material-ui/core/CircularProgress";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Alert from "@material-ui/lab/Alert";

import ChatIcon from "@material-ui/icons/Chat";
import ViewModuleIcon from "@material-ui/icons/ViewModule";
import FlashOnIcon from "@material-ui/icons/FlashOn";
import HistoryIcon from "@material-ui/icons/History";
import SettingsIcon from "@material-ui/icons/Settings";
import ShareIcon from "@material-ui/icons/Share";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import CreateIcon from "@material-ui/icons/Create";
import AddIcon from "@material-ui/icons/Add";
import PersonIcon from "@material-ui/icons/Person";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import VisibilityIcon from "@material-ui/icons/Visibility";
import EditIcon from "@material-ui/icons/Edit";
import PictureAsPdfIcon from "@material-ui/icons/PictureAsPdf";
import GetAppIcon from "@material-ui/icons/GetApp";
import SendIcon from "@material-ui/icons/Send";
import LinkIcon from "@material-ui/icons/Link";
import ImageIcon from "@material-ui/icons/Image";
import FiberManualRecordIcon from "@material-ui/icons/FiberManualRecord";
import ThumbUpIcon from "@material-ui/icons/ThumbUp";
import ThumbDownIcon from "@material-ui/icons/ThumbDown";
import AssignmentIcon from "@material-ui/icons/Assignment";

import { format, parseISO } from "date-fns";

import { CopyToClipboard } from "react-copy-to-clipboard";

import formatSerializedId from "../../utils/formatSerializedId";
import resolveContactWhatsAppPhone, {
	contactHasWhatsAppDestination,
} from "../../utils/resolveContactWhatsAppPhone";
import { i18n } from "../../translate/i18n";
import ContactDrawerSkeleton from "../ContactDrawerSkeleton";
import { AuthContext } from "../../context/Auth/AuthContext";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { toast } from "react-toastify";
import ContactModal from "../ContactModal";
import QuadroModal from "../../pages/Kanban/QuadroModal";
import BudgetOrcamentoModal, { BudgetPrintDocument } from "../BudgetOrcamentoModal";
import OrderServicePrintDocument from "../OrderServicePrintDocument";
import HelpHint from "../HelpHint";
import ContactParticipationKanban from "../ContactParticipationKanban";
import OrderServiceModal from "../OrderServiceModal";
import { generateBudgetPdfBlob, budgetItemsTotal } from "../../utils/generateBudgetPdfBlob";
import {
	digitsOnly as brDigitsOnly,
	formatPhoneBr,
	formatDocumentBr,
} from "../../utils/brazilContactFormat";

const drawerWidth = 450;

const useStyles = makeStyles((theme) => ({
	drawer: {
		width: drawerWidth,
		flexShrink: 0,
	},
	drawerPaper: {
		width: drawerWidth,
		display: "flex",
		borderTop: "1px solid rgba(0, 0, 0, 0.12)",
		borderRight: "1px solid rgba(0, 0, 0, 0.12)",
		borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
		borderTopRightRadius: 4,
		borderBottomRightRadius: 4,
		overflowX: "hidden",
		boxSizing: "border-box",
	},
	topBar: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		padding: "4px 8px",
		borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
		backgroundColor: theme.palette.primary.main,
		minHeight: 48,
	},
	topBarIcons: {
		display: "flex",
		alignItems: "center",
		gap: 2,
	},
	topBarIcon: {
		color: "#fff",
		padding: 6,
	},
	content: {
		display: "flex",
		backgroundColor: theme.palette.inputBackground,
		flexDirection: "column",
		padding: "0px",
		height: "100%",
		overflowY: "auto",
		...theme.scrollbarStyles,
	},
	profileSection: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		padding: "16px 16px 12px",
		position: "relative",
	},
	shareIcon: {
		position: "absolute",
		top: 8,
		right: 8,
	},
	phoneRow: {
		display: "flex",
		alignItems: "center",
		gap: 4,
		marginTop: 4,
	},
	phoneNumber: {
		fontWeight: 600,
		fontSize: 15,
		color: theme.palette.text.primary,
	},
	copyIcon: {
		padding: 4,
		color: theme.palette.primary.main,
	},
	tabsRoot: {
		borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
		minHeight: 36,
		backgroundColor: "#fff",
	},
	tab: {
		minHeight: 36,
		textTransform: "none",
		fontWeight: 600,
		fontSize: 13,
	},
	formSection: {
		padding: "8px 16px 16px",
		display: "flex",
		flexDirection: "column",
		gap: 10,
		overflowX: "hidden",
		boxSizing: "border-box",
		maxWidth: "100%",
	},
	sectionTitle: {
		fontWeight: 600,
		fontSize: 14,
		color: theme.palette.text.secondary,
		marginTop: 8,
		marginBottom: 4,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	fieldRow: {
		display: "flex",
		alignItems: "center",
		gap: 4,
		maxWidth: "100%",
		"& .MuiTextField-root": {
			minWidth: 0,
			flex: 1,
		},
	},
	valueButton: {
		marginTop: 4,
		textTransform: "none",
	},
	chipContainer: {
		display: "flex",
		flexWrap: "wrap",
		gap: 4,
		marginTop: 4,
	},
	productChip: {
		backgroundColor: theme.palette.primary.light,
		color: "#fff",
		padding: "2px 8px",
		borderRadius: 12,
		fontSize: 12,
		display: "flex",
		alignItems: "center",
		gap: 4,
	},
	processCard: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		padding: "14px 16px",
		borderRadius: 10,
		border: "1px solid",
		borderColor: theme.palette.divider,
		backgroundColor: "#fff",
		transition: "box-shadow 0.15s, transform 0.15s",
		"&:hover": {
			boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
			transform: "translateY(-1px)",
		},
	},
	processName: {
		fontWeight: 600,
		fontSize: 14,
		color: theme.palette.text.primary,
		display: "flex",
		alignItems: "center",
		gap: 8,
	},
	processCount: {
		fontWeight: 700,
		fontSize: 18,
		color: theme.palette.primary.main,
		backgroundColor: theme.palette.primary.main + "14",
		borderRadius: 8,
		padding: "4px 12px",
		minWidth: 36,
		textAlign: "center",
	},
	processIcon: {
		width: 32,
		height: 32,
		borderRadius: 8,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		color: "#fff",
		fontSize: 16,
		fontWeight: 700,
		flexShrink: 0,
	},
	processCardClickable: {
		cursor: "pointer",
		userSelect: "none",
	},
	processExpandIcon: {
		transition: "transform 0.2s ease",
		color: theme.palette.text.secondary,
		fontSize: 20,
	},
	processExpandIconOpen: {
		transform: "rotate(180deg)",
	},
	processTicketsList: {
		padding: "8px 0 4px",
		display: "flex",
		flexDirection: "column",
		gap: 6,
	},
	processTicketItem: {
		display: "flex",
		alignItems: "center",
		gap: 10,
		padding: "8px 10px",
		borderRadius: 8,
		backgroundColor: theme.palette.background.default,
		border: "1px solid " + theme.palette.divider,
		transition: "background-color 0.15s",
		"&:hover": {
			backgroundColor: theme.palette.action.hover,
		},
	},
	processTicketThumb: {
		width: 40,
		height: 40,
		borderRadius: 6,
		objectFit: "cover",
		backgroundColor: theme.palette.grey[200],
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
		overflow: "hidden",
	},
	processTicketInfo: {
		flex: 1,
		minWidth: 0,
	},
	processTicketName: {
		fontSize: 13,
		fontWeight: 600,
		color: theme.palette.text.primary,
		whiteSpace: "nowrap",
		overflow: "hidden",
		textOverflow: "ellipsis",
	},
	processTicketMeta: {
		fontSize: 11,
		color: theme.palette.text.secondary,
		display: "flex",
		alignItems: "center",
		gap: 6,
		marginTop: 2,
	},
	processTicketStatus: {
		display: "inline-flex",
		alignItems: "center",
		gap: 3,
		fontSize: 11,
		fontWeight: 500,
	},
	processTicketMediaBadge: {
		display: "inline-flex",
		alignItems: "center",
		gap: 2,
		fontSize: 11,
		color: theme.palette.info.main,
	},
	processLoadingRow: {
		display: "flex",
		justifyContent: "center",
		padding: "12px 0",
	},
	budgetSection: {
		marginTop: 4,
	},
	budgetAccordion: {
		boxShadow: "none",
		border: `1px solid ${theme.palette.divider}`,
		borderRadius: "8px !important",
		marginBottom: theme.spacing(1),
		overflow: "hidden",
		"&:before": { display: "none" },
	},
	budgetAccordionSummary: {
		minHeight: 44,
		backgroundColor:
			theme.palette.type === "dark" ? theme.palette.grey[900] : theme.palette.grey[50],
	},
	budgetRow: {
		padding: "10px 12px",
		borderRadius: 8,
		border: `1px solid ${theme.palette.divider}`,
		backgroundColor: theme.palette.background.paper,
		display: "flex",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: 8,
		transition: "box-shadow 0.15s, border-color 0.15s",
		"&:hover": {
			boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
			borderColor: theme.palette.primary.light,
			"& $budgetActions": {
				opacity: 1,
			},
		},
	},
	budgetRowMain: {
		flex: 1,
		minWidth: 0,
	},
	budgetRowTitle: {
		fontWeight: 600,
		fontSize: 13,
		color: theme.palette.text.primary,
		lineHeight: 1.3,
	},
	budgetRowMeta: {
		fontSize: 11,
		color: theme.palette.text.secondary,
		marginTop: 4,
		display: "flex",
		flexWrap: "wrap",
		gap: "6px 10px",
		alignItems: "center",
	},
	budgetStatusPill: {
		display: "inline-flex",
		alignItems: "center",
		gap: 4,
		fontSize: 10,
		fontWeight: 600,
		textTransform: "uppercase",
		letterSpacing: 0.3,
	},
	budgetActions: {
		display: "flex",
		flexShrink: 0,
		alignItems: "center",
		gap: 0,
		marginTop: -2,
		opacity: 0.72,
		transition: "opacity 0.15s ease",
	},
	budgetStrip: {
		display: "flex",
		flexDirection: "row",
		gap: theme.spacing(1),
		overflowX: "auto",
		paddingBottom: theme.spacing(0.5),
		WebkitOverflowScrolling: "touch",
	},
	budgetStripItem: {
		flex: "0 0 auto",
		minWidth: 268,
		maxWidth: 300,
	},
	compactInfoGrid: {
		display: "grid",
		gridTemplateColumns: "1fr 1fr",
		gap: theme.spacing(1),
	},
	sectionTitleRow: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: theme.spacing(0.5),
	},
	actionBtnRow: {
		display: "flex",
		gap: theme.spacing(1),
		marginBottom: theme.spacing(1.5),
		flexWrap: "wrap",
	},
	osRow: {
		padding: "8px 10px",
		borderRadius: 8,
		border: `1px solid ${alpha("#1565c0", 0.35)}`,
		backgroundColor: alpha("#1565c0", 0.06),
		marginBottom: theme.spacing(0.75),
	},
	budgetOsBanner: {
		marginTop: 8,
		padding: "6px 10px",
		borderRadius: 6,
		backgroundColor: alpha("#2e7d32", 0.1),
		border: `1px solid ${alpha("#2e7d32", 0.35)}`,
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		flexWrap: "wrap",
		gap: 8,
	},
}));

const getExtraInfoValue = (extraInfo, fieldName) => {
	if (!extraInfo || !Array.isArray(extraInfo)) return "";
	const field = extraInfo.find(
		(info) => info.name?.toLowerCase() === fieldName.toLowerCase()
	);
	return field?.value || "";
};

const setExtraInfoValue = (extraInfo, fieldName, value) => {
	if (!extraInfo || !Array.isArray(extraInfo)) extraInfo = [];
	const newExtraInfo = [...extraInfo];
	const index = newExtraInfo.findIndex(
		(info) => info.name?.toLowerCase() === fieldName.toLowerCase()
	);
	if (index !== -1) {
		newExtraInfo[index] = { ...newExtraInfo[index], value };
	} else {
		newExtraInfo.push({ name: fieldName, value });
	}
	return newExtraInfo;
};

const ContactDrawer = ({
	open,
	handleDrawerClose,
	contact,
	ticket,
	loading,
	refreshTicket,
	quickRepliesOpen,
	onToggleQuickReplies,
}) => {
	const classes = useStyles();
	const history = useHistory();
	const { user, socket } = useContext(AuthContext);
	const { get } = useCompanySettings();

	const [modalOpen, setModalOpen] = useState(false);
	const [hideNum, setHideNum] = useState(false);
	const [drawerAvatarSrc, setDrawerAvatarSrc] = useState(undefined);

	// Form state
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		phoneNumber: "",
		document: "",
		country: "",
		city: "",
		state: "",
		addressStreet: "",
		addressNumber: "",
		addressComplement: "",
		addressDistrict: "",
		addressZip: "",
		leadOrigin: "",
		deliveryDate: "",
		dealValue: "0,00",
		company: "",
		position: "",
		productInput: "",
		products: [],
		observation: "",
	});

	const [editingField, setEditingField] = useState(null);
	const [saving, setSaving] = useState(false);
	const [activeTab, setActiveTab] = useState(0);
	const [contactProcesses, setContactProcesses] = useState([]);
	const [loadingProcesses, setLoadingProcesses] = useState(false);
	const [expandedProcess, setExpandedProcess] = useState(null);
	const [processTickets, setProcessTickets] = useState({});
	const [loadingProcessTickets, setLoadingProcessTickets] = useState({});

	const [kanbanDialogOpen, setKanbanDialogOpen] = useState(false);
	const [quadroModalOpen, setQuadroModalOpen] = useState(false);
	const [quadroGroups, setQuadroGroups] = useState([]);
	const [kanbanTags, setKanbanTags] = useState([]);
	const [selectedQuadroGroupId, setSelectedQuadroGroupId] = useState("");
	const [selectedKanbanTagId, setSelectedKanbanTagId] = useState("");
	const [kanbanNomeProjeto, setKanbanNomeProjeto] = useState("");
	const [loadingKanbanMeta, setLoadingKanbanMeta] = useState(false);
	const [attachingKanban, setAttachingKanban] = useState(false);

	const [ticketBudgets, setTicketBudgets] = useState([]);
	const [loadingTicketBudgets, setLoadingTicketBudgets] = useState(false);
	const [budgetModalOpen, setBudgetModalOpen] = useState(false);
	const [orderServiceModalOpen, setOrderServiceModalOpen] = useState(false);
	const [contactOrders, setContactOrders] = useState([]);
	const [loadingContactOrders, setLoadingContactOrders] = useState(false);
	const [contactFinancial, setContactFinancial] = useState(null);
	const notesMigratedRef = useRef(false);
	const [editBudgetId, setEditBudgetId] = useState(null);
	const [budgetPanelsOpen, setBudgetPanelsOpen] = useState({
		pending: true,
		approved: false,
		rejected: false,
	});

	const [budgetAgentLoadingId, setBudgetAgentLoadingId] = useState(null);
	const [rejectBudgetDialog, setRejectBudgetDialog] = useState({
		open: false,
		budget: null,
	});
	const [rejectReason, setRejectReason] = useState("");
	const [orderDetailOpen, setOrderDetailOpen] = useState(false);
	const [orderDetailLoading, setOrderDetailLoading] = useState(false);
	const [orderDetailData, setOrderDetailData] = useState(null);

	const budgetPdfPrintRef = useRef(null);
	const [budgetPdfJob, setBudgetPdfJob] = useState(null);
	const [budgetPdfLoadingId, setBudgetPdfLoadingId] = useState(null);

	const orderPdfPrintRef = useRef(null);
	/** `{ data }` = resposta completa de GET/POST `/ticket-budgets/...` com `payload` + `order` */
	const [osPdfJob, setOsPdfJob] = useState(null);
	const [osPdfLoadingBudgetId, setOsPdfLoadingBudgetId] = useState(null);

	const groupedBudgets = useMemo(() => {
		const pending = [];
		const approved = [];
		const rejected = [];
		for (const b of ticketBudgets) {
			if (b.status === "approved") approved.push(b);
			else if (b.status === "rejected") rejected.push(b);
			else pending.push(b);
		}
		return { pending, approved, rejected };
	}, [ticketBudgets]);

	const loadContactBudgets = useCallback(async () => {
		if (!contact?.id) {
			setTicketBudgets([]);
			return;
		}
		setLoadingTicketBudgets(true);
		try {
			const { data } = await api.get(`/ticket-budgets/contact/${contact.id}`);
			setTicketBudgets(Array.isArray(data) ? data : []);
		} catch {
			setTicketBudgets([]);
		} finally {
			setLoadingTicketBudgets(false);
		}
	}, [contact?.id]);

	const loadContactOrders = useCallback(async () => {
		if (!contact?.id) {
			setContactOrders([]);
			return;
		}
		setLoadingContactOrders(true);
		try {
			const { data } = await api.get(`/ticket-budget-orders/contact/${contact.id}`);
			setContactOrders(Array.isArray(data) ? data : []);
		} catch {
			setContactOrders([]);
		} finally {
			setLoadingContactOrders(false);
		}
	}, [contact?.id]);

	const reloadBudgetsAndOrders = useCallback(async () => {
		await Promise.all([loadContactBudgets(), loadContactOrders()]);
	}, [loadContactBudgets, loadContactOrders]);

	useEffect(() => {
		if (!open || !contact?.id) {
			setTicketBudgets([]);
			setContactOrders([]);
			setContactFinancial(null);
			return;
		}
		reloadBudgetsAndOrders();
		api
			.get(`/contacts/${contact.id}/financial`)
			.then(({ data }) => setContactFinancial(data))
			.catch(() => setContactFinancial(null));
	}, [open, contact?.id, reloadBudgetsAndOrders]);

	useEffect(() => {
		if (!open) notesMigratedRef.current = false;
	}, [open]);

	useEffect(() => {
		if (!open || !ticket?.id || notesMigratedRef.current) return;
		let cancelled = false;
		(async () => {
			try {
				const { data } = await api.get("/ticket-notes/list", {
					params: { ticketId: ticket.id },
				});
				const list = Array.isArray(data) ? data : data?.notes || [];
				if (!list.length || cancelled) return;
				const combined = list
					.map((n) => (n.note || "").trim())
					.filter(Boolean)
					.join("\n");
				if (!combined) return;
				setFormData((prev) => {
					const existing = (prev.observation || "").trim();
					if (existing && existing.includes(combined.slice(0, 24))) return prev;
					return {
						...prev,
						observation: existing ? `${existing}\n\n${combined}` : combined,
					};
				});
				notesMigratedRef.current = true;
			} catch {
				/* notas do ticket opcionais */
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [open, ticket?.id]);

	const handleApproveBudgetAgent = useCallback(
		async (b) => {
			setBudgetAgentLoadingId(b.id);
			try {
				const { data } = await api.post(`/ticket-budgets/${b.id}/approve-agent`);
				const num = data?.order?.orderNumber;
				toast.success(
					num
						? `OS ${num} gerada com sucesso.`
						: "Orçamento aprovado e OS gerada."
				);
				if (data?.budget?.payload && data?.order) {
					setOsPdfJob({
						data: { ...data.budget, order: data.order },
						action: "download",
					});
				}
				await reloadBudgetsAndOrders();
				if (refreshTicket) refreshTicket();
			} catch (e) {
				toastError(e);
			} finally {
				setBudgetAgentLoadingId(null);
			}
		},
		[reloadBudgetsAndOrders, refreshTicket]
	);

	const queueOsPdfDownload = useCallback(async (b) => {
		if (!b?.id) return;
		setOsPdfLoadingBudgetId(b.id);
		try {
			const { data } = await api.get(`/ticket-budgets/${b.id}`);
			if (!data?.payload || !data?.order) {
				toast.warning("Não há OS ou dados completos para gerar o PDF.");
				setOsPdfLoadingBudgetId(null);
				return;
			}
			setOsPdfJob({ data, action: "download" });
		} catch (e) {
			toastError(e);
			setOsPdfLoadingBudgetId(null);
		}
	}, []);

	const handleRejectBudgetAgentConfirm = useCallback(async () => {
		const b = rejectBudgetDialog.budget;
		if (!b) return;
		setBudgetAgentLoadingId(b.id);
		try {
			await api.post(`/ticket-budgets/${b.id}/reject-agent`, {
				reason: rejectReason.trim() || undefined,
			});
			toast.success("Orçamento recusado.");
			setRejectBudgetDialog({ open: false, budget: null });
			setRejectReason("");
			await reloadBudgetsAndOrders();
			if (refreshTicket) refreshTicket();
		} catch (e) {
			toastError(e);
		} finally {
			setBudgetAgentLoadingId(null);
		}
	}, [rejectBudgetDialog.budget, rejectReason, reloadBudgetsAndOrders, refreshTicket]);

	const openOrderDetailDialog = useCallback(async (b) => {
		setOrderDetailOpen(true);
		setOrderDetailLoading(true);
		setOrderDetailData(null);
		try {
			const { data } = await api.get(`/ticket-budgets/${b.id}`);
			setOrderDetailData(data);
		} catch (e) {
			toastError(e);
			setOrderDetailOpen(false);
		} finally {
			setOrderDetailLoading(false);
		}
	}, []);

	const contactForWhatsApp = useMemo(
		() => ({ ...(ticket?.contact || {}), ...(contact || {}) }),
		[ticket?.contact, contact]
	);

	const contactHasWhatsAppPhone = useCallback(() => {
		return contactHasWhatsAppDestination(contactForWhatsApp);
	}, [contactForWhatsApp]);

	useEffect(() => {
		setDrawerAvatarSrc(contact?.urlPicture || contact?.profilePicUrl || undefined);
	}, [contact?.id, contact?.urlPicture, contact?.profilePicUrl]);

	const handleDrawerAvatarError = useCallback(() => {
		const c = contact;
		if (!c) return;
		setDrawerAvatarSrc((prev) => {
			if (prev && c.urlPicture && prev === c.urlPicture && c.profilePicUrl && c.profilePicUrl !== c.urlPicture) {
				return c.profilePicUrl;
			}
			return undefined;
		});
	}, [contact]);

	const queueOsPdfSendWhatsApp = useCallback(
		async (b) => {
			if (!b?.id) return;
			if (!contactHasWhatsAppPhone()) {
				toast.warning("Nenhum número vinculado ao contato.");
				return;
			}
			if (!ticket?.id) {
				toast.warning("Ticket não disponível.");
				return;
			}
			setOsPdfLoadingBudgetId(b.id);
			try {
				const { data } = await api.get(`/ticket-budgets/${b.id}`);
				if (!data?.payload || !data?.order) {
					toast.warning("Não há OS ou dados completos para enviar.");
					setOsPdfLoadingBudgetId(null);
					return;
				}
				setOsPdfJob({ data, action: "whatsapp" });
			} catch (e) {
				toastError(e);
				setOsPdfLoadingBudgetId(null);
			}
		},
		[contactHasWhatsAppPhone, ticket?.id]
	);

	useLayoutEffect(() => {
		if (!budgetPdfJob) return undefined;
		let cancelled = false;
		const run = async () => {
			await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
			if (cancelled) return;
			const el = budgetPdfPrintRef.current;
			if (!el) {
				toast.warning("Não foi possível montar o PDF.");
				setBudgetPdfJob(null);
				setBudgetPdfLoadingId(null);
				return;
			}
			try {
				const blob = await generateBudgetPdfBlob(el);
				if (cancelled) return;
				if (budgetPdfJob.action === "download") {
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = url;
					a.download = `orcamento-${budgetPdfJob.record.budgetNumber || budgetPdfJob.record.id}.pdf`;
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					URL.revokeObjectURL(url);
					toast.success("PDF gerado e baixado.");
				} else {
					const fd = new FormData();
					fd.append(
						"pdf",
						blob,
						`orcamento-${budgetPdfJob.record.budgetNumber || budgetPdfJob.record.id}.pdf`
					);
					await api.post(
						`/ticket-budgets/${budgetPdfJob.record.id}/send-pdf-whatsapp`,
						fd,
						{
							headers: { "Content-Type": "multipart/form-data" },
						}
					);
					toast.success("PDF enviado pelo WhatsApp.");
				}
			} catch (e) {
				if (!cancelled) toastError(e);
			} finally {
				if (!cancelled) {
					setBudgetPdfJob(null);
					setBudgetPdfLoadingId(null);
				}
			}
		};
		run();
		return () => {
			cancelled = true;
		};
	}, [budgetPdfJob]);

	useLayoutEffect(() => {
		if (!osPdfJob?.data?.payload || !osPdfJob?.data?.order) return undefined;
		const data = osPdfJob.data;
		const action = osPdfJob.action || "download";
		let cancelled = false;
		const run = async () => {
			await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
			if (cancelled) return;
			const el = orderPdfPrintRef.current;
			if (!el) {
				toast.warning("Não foi possível montar o PDF da OS.");
				setOsPdfJob(null);
				setOsPdfLoadingBudgetId(null);
				return;
			}
			try {
				const blob = await generateBudgetPdfBlob(el);
				if (cancelled) return;
				const on = data.order.orderNumber || String(data.order.id || "os");
				const safe = String(on).replace(/[^\w.-]+/g, "_");
				const filename = `ordem-servico-${safe}.pdf`;
				if (action === "whatsapp") {
					const fd = new FormData();
					fd.append("pdf", blob, filename);
					await api.post(`/ticket-budgets/${data.id}/send-order-pdf-whatsapp`, fd, {
						headers: { "Content-Type": "multipart/form-data" },
					});
					toast.success("PDF da OS enviado pelo WhatsApp.");
				} else {
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = url;
					a.download = filename;
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					URL.revokeObjectURL(url);
					toast.success("PDF da ordem de serviço baixado.");
				}
			} catch (e) {
				if (!cancelled) toastError(e);
			} finally {
				if (!cancelled) {
					setOsPdfJob(null);
					setOsPdfLoadingBudgetId(null);
				}
			}
		};
		run();
		return () => {
			cancelled = true;
		};
	}, [osPdfJob]);

	const queueBudgetPdfDownload = async (b) => {
		setBudgetPdfLoadingId(b.id);
		try {
			const { data } = await api.get(`/ticket-budgets/${b.id}`);
			if (!data?.payload) {
				toast.warning("Orçamento sem dados para gerar PDF.");
				setBudgetPdfLoadingId(null);
				return;
			}
			setBudgetPdfJob({ record: data, action: "download" });
		} catch (e) {
			toastError(e);
			setBudgetPdfLoadingId(null);
		}
	};

	const queueBudgetPdfSendWhatsApp = async (b) => {
		if (!contactHasWhatsAppPhone()) {
			toast.warning("Nenhum número vinculado ao contato.");
			return;
		}
		if (!ticket?.id) {
			toast.warning("Ticket não disponível.");
			return;
		}
		setBudgetPdfLoadingId(b.id);
		try {
			const { data } = await api.get(`/ticket-budgets/${b.id}`);
			if (!data?.payload) {
				toast.warning("Orçamento sem dados para gerar PDF.");
				setBudgetPdfLoadingId(null);
				return;
			}
			setBudgetPdfJob({ record: data, action: "send" });
		} catch (e) {
			toastError(e);
			setBudgetPdfLoadingId(null);
		}
	};

	const loadKanbanTagsByGroup = useCallback(
		async (groupIdRaw) => {
			const groupIdNum = Number(groupIdRaw);
			if (!Number.isFinite(groupIdNum) || groupIdNum <= 0) {
				setKanbanTags([]);
				setSelectedKanbanTagId("");
				return;
			}
			try {
				const { data } = await api.get("/tag/kanban/", {
					params: { quadroGroupId: groupIdNum },
				});
				const list = Array.isArray(data?.lista) ? data.lista : [];
				setKanbanTags(list);

				let preselectedLaneId = "";
				if (contact?.id) {
					try {
						const { data: tk } = await api.get("/ticket/kanban", {
							params: { contactId: contact.id, quadroGroupId: groupIdNum },
						});
						const tickets = Array.isArray(tk?.tickets) ? tk.tickets : [];
						const candidate = tickets.find((t) => Number(t?.id) > 0) || tickets[0];
						const lane = (candidate?.tags || []).find(
							(tg) => Number(tg?.kanban) === 1
						);
						if (lane && list.some((t) => String(t.id) === String(lane.id))) {
							preselectedLaneId = String(lane.id);
						}
					} catch (_) {
						/* ignore */
					}
				}
				setSelectedKanbanTagId(preselectedLaneId);
			} catch (_) {
				setKanbanTags([]);
				setSelectedKanbanTagId("");
			}
		},
		[contact?.id]
	);

	useEffect(() => {
		async function fetchData() {
			try {
				const lgpdHideNumber = await get({ column: "lgpdHideNumber" });
				if (lgpdHideNumber === "enabled") setHideNum(true);
			} catch (err) {
				// ignore
			}
		}
		fetchData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (contact?.id) {
			const extra = contact.extraInfo || [];
			const productsRaw = getExtraInfoValue(extra, "produtos_interesse");
			setFormData({
				name: contact.name || "",
				email: contact.email || "",
				phoneNumber: contact.number || "",
				document:
					(contact.document && String(contact.document)) ||
					getExtraInfoValue(extra, "cpf_cnpj") ||
					"",
				country: getExtraInfoValue(extra, "pais") || "",
				city: getExtraInfoValue(extra, "cidade") || "",
				state: getExtraInfoValue(extra, "estado") || "",
				addressStreet: getExtraInfoValue(extra, "endereco") || "",
				addressNumber:
					getExtraInfoValue(extra, "numero_endereco") ||
					getExtraInfoValue(extra, "numero") ||
					"",
				addressComplement: getExtraInfoValue(extra, "complemento") || "",
				addressDistrict: getExtraInfoValue(extra, "bairro") || "",
				addressZip: getExtraInfoValue(extra, "cep") || "",
				leadOrigin: getExtraInfoValue(extra, "origem_lead") || "",
				deliveryDate:
					getExtraInfoValue(extra, "data_entrega") ||
					getExtraInfoValue(extra, "data_saida") ||
					"",
				dealValue: getExtraInfoValue(extra, "valor_negocio") || "0,00",
				company: getExtraInfoValue(extra, "empresa") || "",
				position: getExtraInfoValue(extra, "cargo") || "",
				productInput: "",
				products: productsRaw ? productsRaw.split(",").map((p) => p.trim()).filter(Boolean) : [],
				observation:
					(contact.observation && String(contact.observation).trim()) ||
					getExtraInfoValue(extra, "observacao") ||
					"",
			});
		}
	}, [contact]);

	const loadProcesses = useCallback(async () => {
		if (!contact?.id) return;
		setLoadingProcesses(true);
		try {
			const { data } = await api.get(`/contacts/${contact.id}/processes`);
			setContactProcesses(data.processes || data || []);
		} catch (err) {
			try {
				const { data: ticketsData } = await api.get("/ticket/kanban", {
					params: { contactId: contact.id },
				});
				const ticketsList = ticketsData.tickets || [];
				let groups = [];
				try {
					const { data: groupsData } = await api.get("/quadro-groups");
					groups = groupsData.groups || groupsData.lista || groupsData || [];
				} catch (gErr) {
					groups = [{ id: 1, name: "Kanban" }];
				}
				const groupMap = {};
				for (const t of ticketsList) {
					const gId = t.quadroGroupId || t.quadro_group_id || "1";
					if (!groupMap[gId]) groupMap[gId] = 0;
					groupMap[gId]++;
				}
				const processList = Object.entries(groupMap).map(([gId, count]) => {
					const group = groups.find((g) => String(g.id) === String(gId));
					return {
						groupId: gId,
						groupName: group?.name || "Kanban",
						count,
					};
				});
				setContactProcesses(processList);
			} catch (innerErr) {
				setContactProcesses([]);
			}
		}
		setLoadingProcesses(false);
	}, [contact?.id]);

	// Carregar processos do contato (em quantos quadros/áreas ele está)
	useEffect(() => {
		if (activeTab !== 1 || !contact?.id) return;
		loadProcesses();
	}, [activeTab, contact?.id, loadProcesses]);

	// Atualiza fluxos Kanban quando algum ticket/quadro mudar via socket
	useEffect(() => {
		if (activeTab !== 1 || !contact?.id || !user?.companyId || !socket) return;
		const eventName = `company-${user.companyId}-ticket`;
		let timer = null;
		const scheduleReload = () => {
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => {
				loadProcesses();
				reloadBudgetsAndOrders();
			}, 400);
		};
		const handler = () => scheduleReload();
		socket.on(eventName, handler);
		return () => {
			if (timer) clearTimeout(timer);
			socket.off(eventName, handler);
		};
	}, [activeTab, contact?.id, user?.companyId, socket, loadProcesses, reloadBudgetsAndOrders]);

	const handleToggleProcess = async (groupId) => {
		if (expandedProcess === groupId) {
			setExpandedProcess(null);
			return;
		}
		setExpandedProcess(groupId);

		if (processTickets[groupId]) return;

		setLoadingProcessTickets((prev) => ({ ...prev, [groupId]: true }));
		try {
			const { data } = await api.get("/ticket/kanban", {
				params: { contactId: contact.id, quadroGroupId: groupId },
			});
			const ticketsList = data.tickets || data || [];

			const enriched = await Promise.all(
				ticketsList.map(async (t) => {
					let quadroData = null;
					let attachments = [];
					try {
						const { data: qd } = await api.get(`/tickets/${t.uuid || t.id}/quadro`);
						quadroData = qd.quadro || null;
						attachments = qd.attachments || [];
					} catch (_) {}
					return {
						id: t.id,
						uuid: t.uuid,
						contactName: t.contact?.name || contact?.name || "Sem nome",
						contactPic: t.contact?.urlPicture || t.contact?.profilePicUrl || null,
						status: quadroData?.status || "aguardando",
						description: quadroData?.description || "",
						nomeProjeto: quadroData?.nomeProjeto || "",
						valorServico: quadroData?.valorServico || 0,
						createdAt: t.createdAt,
						updatedAt: t.updatedAt,
						attachments,
						hasMedia: attachments.length > 0,
						capaUrl: (attachments.find((a) => a.isCapa) || attachments[0])?.url || null,
						tagName: t.tags?.[0]?.tag || t.tags?.[0]?.name || "",
					};
				})
			);
			setProcessTickets((prev) => ({ ...prev, [groupId]: enriched }));
		} catch (err) {
			setProcessTickets((prev) => ({ ...prev, [groupId]: [] }));
		}
		setLoadingProcessTickets((prev) => ({ ...prev, [groupId]: false }));
	};

	const resolveImageUrl = (url) => {
		if (!url || typeof url !== "string") return null;
		if (url.startsWith("http://") || url.startsWith("https://")) return url;
		const base = process.env.REACT_APP_BACKEND_URL || "";
		return base + (url.startsWith("/") ? url : "/" + url);
	};

	const getStatusColor = (status) => {
		const map = {
			aguardando: "#fbc02d",
			em_andamento: "#1976d2",
			concluido: "#388e3c",
			cancelado: "#d32f2f",
		};
		return map[status] || "#9e9e9e";
	};

	const getStatusLabel = (status) => {
		const map = {
			aguardando: "Aguardando",
			em_andamento: "Em andamento",
			concluido: "Concluído",
			cancelado: "Cancelado",
		};
		return map[status] || status;
	};

	const handleFieldChange = (field, value) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const openKanbanDialog = async () => {
		setKanbanDialogOpen(true);
		setLoadingKanbanMeta(true);
		setKanbanNomeProjeto((ticket?.nomeProjeto || "").trim());
		try {
			const [groupsRes] = await Promise.all([
				api.get("/quadro-groups").catch(() => ({ data: {} })),
			]);
			const gData = groupsRes.data;
			const groups = gData?.groups || gData?.lista || gData || [];
			setQuadroGroups(Array.isArray(groups) ? groups : []);

			const tqg =
				ticket?.quadroGroupId != null && ticket?.quadroGroupId !== ""
					? ticket.quadroGroupId
					: null;
			const defaultGroupId =
				tqg != null
					? String(tqg)
					: Array.isArray(groups) && groups.length === 1
					? String(groups[0].id)
					: "";
			setSelectedQuadroGroupId(defaultGroupId);

			const firstTag = ticket?.tags?.[0];
			if (firstTag?.id) setSelectedKanbanTagId(String(firstTag.id));
			else setSelectedKanbanTagId("");
			if (defaultGroupId) {
				await loadKanbanTagsByGroup(defaultGroupId);
			} else {
				setKanbanTags([]);
			}
		} catch (err) {
			toastError(err);
		}
		setLoadingKanbanMeta(false);
	};

	useEffect(() => {
		if (!kanbanDialogOpen) return;
		loadKanbanTagsByGroup(selectedQuadroGroupId);
	}, [kanbanDialogOpen, selectedQuadroGroupId, loadKanbanTagsByGroup]);

	const handleConfirmKanbanLink = async () => {
		if (!ticket?.id) {
			toast.error("Nenhum ticket ativo para vincular ao Kanban.");
			return;
		}
		if (!selectedQuadroGroupId) {
			toast.warn("Selecione a área de trabalho (workspace).");
			return;
		}

		const targetGroupId = Number(selectedQuadroGroupId);
		const currentGroupId =
			ticket?.quadroGroupId != null && ticket.quadroGroupId !== ""
				? Number(ticket.quadroGroupId)
				: null;
		const nomeProjetoTrim = (kanbanNomeProjeto || "").trim();

		// Cada contato fica em 1 quadro por vez. Se o usuário escolheu outro quadro,
		// confirmar antes de mover (para evitar conversa duplicada).
		if (currentGroupId != null && currentGroupId !== targetGroupId) {
			const fromName =
				quadroGroups.find((g) => Number(g.id) === currentGroupId)?.name ||
				`Quadro #${currentGroupId}`;
			const toName =
				quadroGroups.find((g) => Number(g.id) === targetGroupId)?.name ||
				`Quadro #${targetGroupId}`;
			const ok = window.confirm(
				`O cliente vai sair de "${fromName}" e ir para "${toName}". ` +
					`Cada cliente fica em apenas 1 quadro por vez.\n\n` +
					`Se quiser que outro quadro cuide do cliente em paralelo (sem mover este ticket), ` +
					`crie um cartão direto pela área Kanban daquele quadro.\n\nDeseja continuar?`
			);
			if (!ok) return;
		}

		setAttachingKanban(true);
		try {
			await api.put(`/tickets/${ticket.id}`, {
				quadroGroupId: targetGroupId,
			});
			if (selectedKanbanTagId) {
				try {
					await api.delete(`/ticket-tags/${ticket.id}`);
				} catch (_) {
					/* sem tag anterior */
				}
				await api.put(`/ticket-tags/${ticket.id}/${selectedKanbanTagId}`);
			}
			if (ticket?.uuid && nomeProjetoTrim) {
				await api.put(`/tickets/${ticket.uuid}/quadro`, {
					nomeProjeto: nomeProjetoTrim,
				});
			}
			if (typeof refreshTicket === "function") await refreshTicket();
			toast.success("Ticket vinculado à área Kanban.");
			setKanbanDialogOpen(false);
			setQuadroModalOpen(true);
		} catch (err) {
			toastError(err);
		}
		setAttachingKanban(false);
	};

	/** Espelha no TicketQuadro (card Kanban) nome, empresa, e-mail e endereço — mantém outros campos do quadro. */
	const syncTicketQuadroFromContactFields = useCallback(async () => {
		if (!ticket?.uuid) return;
		try {
			const { data: qd } = await api.get(`/tickets/${ticket.uuid}/quadro`);
			const quadro = qd.quadro;
			if (!quadro) return;
			const existing = Array.isArray(quadro.customFields)
				? quadro.customFields.map((f) => ({ ...f }))
				: [];
			const addressLine = [
				formData.addressStreet,
				formData.addressNumber,
				formData.addressComplement,
				formData.addressDistrict,
				formData.addressZip,
				formData.city,
				formData.state,
				formData.country,
			]
				.map((x) => (x || "").trim())
				.filter(Boolean)
				.join(", ");

			const docDigits = brDigitsOnly(formData.document);
			const docLine = docDigits ? formatDocumentBr(docDigits) : "";

			const upserts = [
				["Endereço", addressLine],
				["Empresa", formData.company],
				["Nome do Cliente", formData.name],
				["E-mail", formData.email],
				["CPF/CNPJ", docLine],
			];
			for (const [label, val] of upserts) {
				if (!val || !String(val).trim()) continue;
				const i = existing.findIndex((f) => (f.name || "").toLowerCase() === String(label).toLowerCase());
				const entry = { name: label, value: String(val).trim(), type: "text" };
				if (i >= 0) existing[i] = entry;
				else existing.push(entry);
			}
			const payload = {
				customFields: existing
					.filter((f) => (f.name || "").trim())
					.map((f) => ({
						name: (f.name || "").trim(),
						value: (f.value || "").trim(),
						type: f.type || "text",
					})),
			};
			if (!quadro.nomeProjeto && (formData.company || "").trim()) {
				payload.nomeProjeto = formData.company.trim();
			}
			await api.put(`/tickets/${ticket.uuid}/quadro`, payload);
		} catch (_) {
			/* Sem linha de quadro ou ticket sem Kanban */
		}
	}, [ticket?.uuid, formData]);

	const handleSaveAllContactFields = useCallback(
		async () => {
			if (!contact?.id) return;
			setSaving(true);

			const num = brDigitsOnly(formData.phoneNumber);
			const docDigits = brDigitsOnly(formData.document);
			if (!num || num.length < 10) {
				toast.warning("Informe um telefone válido (DDD + número).");
				setSaving(false);
				return;
			}
			if (docDigits.length > 0 && docDigits.length !== 11 && docDigits.length !== 14) {
				toast.warning("CPF/CNPJ: informe 11 dígitos (CPF) ou 14 dígitos (CNPJ).");
				setSaving(false);
				return;
			}

			try {
				let updateData = {};
				let extraInfo = contact.extraInfo ? [...contact.extraInfo] : [];

				updateData.name = formData.name;
				updateData.email = formData.email;
				updateData.number = num;
				updateData.document = docDigits.length ? docDigits : null;
				updateData.observation = formData.observation || "";

				const extraFieldMap = {
					country: "pais",
					city: "cidade",
					state: "estado",
					addressStreet: "endereco",
					addressNumber: "numero_endereco",
					addressComplement: "complemento",
					addressDistrict: "bairro",
					addressZip: "cep",
					leadOrigin: "origem_lead",
					deliveryDate: "data_entrega",
					dealValue: "valor_negocio",
					company: "empresa",
					position: "cargo",
					products: "produtos_interesse",
				};

				for (const [field, extraName] of Object.entries(extraFieldMap)) {
					const value = field === "products" ? formData.products.join(", ") : formData[field];
					extraInfo = setExtraInfoValue(extraInfo, extraName, value);
				}
				extraInfo = setExtraInfoValue(extraInfo, "cpf_cnpj", docDigits || "");
				extraInfo = setExtraInfoValue(extraInfo, "observacao", formData.observation || "");
				updateData.extraInfo = extraInfo;

				await api.put(`/contacts/${contact.id}`, updateData);
				setEditingField(null);
				await syncTicketQuadroFromContactFields();
				toast.success("Dados do contato salvos e quadro Kanban atualizado.");
				if (typeof refreshTicket === "function") await refreshTicket();
			} catch (err) {
				toastError(err);
			}
			setSaving(false);
		},
		[contact, formData, refreshTicket, syncTicketQuadroFromContactFields]
	);

	const handleAddProduct = () => {
		const product = formData.productInput.trim();
		if (!product) return;
		const newProducts = [...formData.products, product];
		setFormData((prev) => ({ ...prev, products: newProducts, productInput: "" }));
	};

	const handleRemoveProduct = (index) => {
		const newProducts = formData.products.filter((_, i) => i !== index);
		setFormData((prev) => ({ ...prev, products: newProducts }));
	};

	const handleCopy = () => {
		toast.success("Número copiado!");
	};

	const phoneResolved = useMemo(
		() => resolveContactWhatsAppPhone(contact),
		[contact]
	);

	const getDisplayNumber = () => {
		if (phoneResolved.isInternalId && !phoneResolved.copyText) {
			return phoneResolved.displayLine;
		}
		const raw = phoneResolved.copyText || contact?.number;
		if (!raw) return phoneResolved.displayLine || "";
		if (hideNum && user.profile === "user") {
			const formatted = formatSerializedId(raw);
			return formatted
				? formatted.slice(0, -6) + "**-**" + String(raw).slice(-2)
				: String(raw);
		}
		return phoneResolved.displayLine || formatSerializedId(contact.number) || contact.number;
	};

	const formatBudgetBRL = useCallback(
		(n) =>
			(Number(n) || 0).toLocaleString("pt-BR", {
				style: "currency",
				currency: "BRL",
			}),
		[]
	);

	const handleBudgetPanelToggle = useCallback((panel) => (_, expanded) => {
		setBudgetPanelsOpen((prev) => ({ ...prev, [panel]: expanded }));
	}, []);

	const renderBudgetRow = (b) => {
		const statusColor =
			b.status === "approved" ? "#2e7d32" : b.status === "rejected" ? "#c62828" : "#f9a825";
		const statusLabel =
			b.status === "approved"
				? "Aprovado"
				: b.status === "rejected"
					? "Recusado"
					: "Pendente";
		const publicUrl = `${window.location.origin}/orcamento/${b.publicToken}`;
		const title = b.displayTitle || b.budgetNumber;
		const created =
			b.createdAt != null ? new Date(b.createdAt).toLocaleDateString("pt-BR") : "—";
		const totalStr = formatBudgetBRL(b.totalValue != null ? b.totalValue : 0);

		return (
			<Paper key={b.id} elevation={0} className={classes.budgetRow}>
				<div className={classes.budgetRowMain}>
					<Typography className={classes.budgetRowTitle}>{title}</Typography>
					<div className={classes.budgetRowMeta}>
						<span style={{ fontWeight: 600, color: "#1b5e20" }}>{totalStr}</span>
						<span>·</span>
						<span>Criado em {created}</span>
						<span className={classes.budgetStatusPill} style={{ color: statusColor }}>
							<FiberManualRecordIcon style={{ fontSize: 8, color: statusColor }} />
							{statusLabel}
						</span>
						<span style={{ fontSize: 10, color: "#999" }}>Nº {b.budgetNumber}</span>
					</div>
					{b.status === "approved" && b.orderNumber && (
						<div className={classes.budgetOsBanner}>
							<Typography variant="caption" component="div" style={{ fontWeight: 500 }}>
								OS gerada: <strong>{b.orderNumber}</strong>
								{b.orderTotal != null && (
									<>
										{" "}
										· {formatBudgetBRL(b.orderTotal)} ·{" "}
										<span style={{ color: "#2e7d32" }}>Em produção</span>
									</>
								)}
							</Typography>
							<Box display="flex" alignItems="center" style={{ gap: 2 }}>
								<Tooltip title="Baixar PDF da OS">
									<span>
										<IconButton
											size="small"
											disabled={osPdfLoadingBudgetId === b.id}
											onClick={() => queueOsPdfDownload(b)}
											aria-label="Baixar PDF da ordem de serviço"
										>
											{osPdfLoadingBudgetId === b.id ? (
												<CircularProgress size={18} />
											) : (
												<GetAppIcon fontSize="small" />
											)}
										</IconButton>
									</span>
								</Tooltip>
								{ticket?.id && contact?.id ? (
									<Tooltip title="Enviar PDF da OS no WhatsApp">
										<span>
											<IconButton
												size="small"
												style={{ color: "#25d366" }}
												disabled={osPdfLoadingBudgetId === b.id}
												onClick={() => queueOsPdfSendWhatsApp(b)}
												aria-label="Enviar PDF da ordem de serviço no WhatsApp"
											>
												{osPdfLoadingBudgetId === b.id ? (
													<CircularProgress size={18} />
												) : (
													<SendIcon fontSize="small" />
												)}
											</IconButton>
										</span>
									</Tooltip>
								) : null}
								<Tooltip title="Ver ordem de serviço">
									<IconButton
										size="small"
										onClick={() => openOrderDetailDialog(b)}
										aria-label="Ver ordem de serviço"
									>
										<AssignmentIcon fontSize="small" />
									</IconButton>
								</Tooltip>
							</Box>
						</div>
					)}
					{b.status === "rejected" && b.rejectionReason ? (
						<Typography
							variant="caption"
							color="textSecondary"
							component="div"
							style={{ marginTop: 8 }}
						>
							Motivo da recusa: {b.rejectionReason}
						</Typography>
					) : null}
				</div>
				<div className={classes.budgetActions}>
					<Tooltip title="Visualizar">
						<IconButton size="small" onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}>
							<VisibilityIcon fontSize="small" />
						</IconButton>
					</Tooltip>
					<Tooltip title="Copiar link público">
						<IconButton
							size="small"
							onClick={() => {
								if (navigator.clipboard?.writeText) {
									navigator.clipboard.writeText(publicUrl);
									toast.success("Link copiado.");
								}
							}}
						>
							<FileCopyIcon fontSize="small" />
						</IconButton>
					</Tooltip>
					{b.status === "pending" && (
						<Tooltip title="Editar">
							<IconButton
								size="small"
								color="primary"
								onClick={() => {
									setEditBudgetId(b.id);
									setBudgetModalOpen(true);
								}}
							>
								<EditIcon fontSize="small" />
							</IconButton>
						</Tooltip>
					)}
					{b.status === "pending" && (
						<Tooltip title="Aprovar orçamento">
							<span>
								<IconButton
									size="small"
									disabled={budgetAgentLoadingId === b.id}
									onClick={() => handleApproveBudgetAgent(b)}
									aria-label="Aprovar orçamento"
									style={{ color: "#2e7d32" }}
								>
									{budgetAgentLoadingId === b.id ? (
										<CircularProgress size={18} style={{ color: "#2e7d32" }} />
									) : (
										<ThumbUpIcon fontSize="small" />
									)}
								</IconButton>
							</span>
						</Tooltip>
					)}
					{b.status === "pending" && (
						<Tooltip title="Recusar orçamento">
							<span>
								<IconButton
									size="small"
									disabled={budgetAgentLoadingId === b.id}
									onClick={() => {
										setRejectReason("");
										setRejectBudgetDialog({ open: true, budget: b });
									}}
									aria-label="Recusar orçamento"
									style={{ color: "#c62828" }}
								>
									<ThumbDownIcon fontSize="small" />
								</IconButton>
							</span>
						</Tooltip>
					)}
					<Tooltip title="Gerar e baixar PDF (layout do orçamento)">
						<span>
							<IconButton
								size="small"
								disabled={budgetPdfLoadingId === b.id}
								onClick={() => queueBudgetPdfDownload(b)}
							>
								{budgetPdfLoadingId === b.id ? (
									<CircularProgress size={18} />
								) : (
									<PictureAsPdfIcon fontSize="small" />
								)}
							</IconButton>
						</span>
					</Tooltip>
					{ticket?.id && contact?.id ? (
						<Tooltip title="Enviar PDF no WhatsApp (gera e envia automaticamente)">
							<span>
								<IconButton
									size="small"
									style={{ color: "#25d366" }}
									disabled={budgetPdfLoadingId === b.id}
									onClick={() => queueBudgetPdfSendWhatsApp(b)}
								>
									<SendIcon fontSize="small" />
								</IconButton>
							</span>
						</Tooltip>
					) : null}
					{ticket?.id && contact?.id ? (
						<Tooltip title="Enviar link público no WhatsApp">
							<span>
								<IconButton
									size="small"
									onClick={async () => {
										if (!contactHasWhatsAppPhone()) {
											toast.warning("Nenhum número vinculado ao contato.");
											return;
										}
										try {
											await api.post(`/ticket-budgets/${b.id}/send-link-whatsapp`);
											toast.success("Link enviado pelo WhatsApp.");
										} catch (e) {
											toastError(e);
										}
									}}
								>
									<LinkIcon fontSize="small" />
								</IconButton>
							</span>
						</Tooltip>
					) : null}
				</div>
			</Paper>
		);
	};

	if (loading) return null;

	return (
		<>
			{budgetPdfJob?.record?.payload && (
				<div
					style={{
						position: "fixed",
						left: 0,
						top: 0,
						transform: "translateX(-12000px)",
						width: 800,
						pointerEvents: "none",
					}}
					aria-hidden
				>
					<BudgetPrintDocument
						ref={budgetPdfPrintRef}
						companyBlock={budgetPdfJob.record.payload.company}
						clientBlock={budgetPdfJob.record.payload.client}
						sellerName={budgetPdfJob.record.payload.sellerName || ""}
						notes={budgetPdfJob.record.payload.notes || ""}
						items={budgetPdfJob.record.payload.items || []}
						totals={budgetItemsTotal(budgetPdfJob.record.payload.items)}
						budgetNumber={budgetPdfJob.record.budgetNumber}
						validUntil={budgetPdfJob.record.validUntil || ""}
					/>
				</div>
			)}
			{osPdfJob?.data?.payload && osPdfJob?.data?.order && (
				<div
					style={{
						position: "fixed",
						left: 0,
						top: 0,
						transform: "translateX(-12000px)",
						width: 800,
						pointerEvents: "none",
					}}
					aria-hidden
				>
					<OrderServicePrintDocument
						key={`os-print-${osPdfJob.data.order.id}-${osPdfJob.data.order.orderNumber}`}
						ref={orderPdfPrintRef}
						companyBlock={osPdfJob.data.payload.company || {}}
						clientBlock={osPdfJob.data.payload.client || {}}
						sellerName={osPdfJob.data.payload.sellerName || ""}
						notes={osPdfJob.data.payload.notes || ""}
						items={osPdfJob.data.order.items || []}
						totals={
							osPdfJob.data.order.total != null && osPdfJob.data.order.total !== ""
								? Number(osPdfJob.data.order.total)
								: budgetItemsTotal(osPdfJob.data.order.items || [])
						}
						orderNumber={osPdfJob.data.order.orderNumber}
						budgetNumber={osPdfJob.data.budgetNumber}
						orderCreatedAt={osPdfJob.data.order.createdAt}
					/>
				</div>
			)}
			<Drawer
				className={classes.drawer}
				variant="persistent"
				anchor="right"
				open={open}
				PaperProps={{ style: { position: "absolute" } }}
				BackdropProps={{ style: { position: "absolute" } }}
				ModalProps={{
					container: document.getElementById("drawer-container"),
					style: { position: "absolute" },
				}}
				classes={{
					paper: classes.drawerPaper,
				}}
			>
				{/* TOP BAR */}
				<div className={classes.topBar}>
					<div className={classes.topBarIcons}>
						<Tooltip title="Mensagens">
							<IconButton className={classes.topBarIcon} size="small">
								<ChatIcon fontSize="small" />
							</IconButton>
						</Tooltip>
						<Tooltip
							title={
								typeof onToggleQuickReplies === "function"
									? quickRepliesOpen
										? i18n.t("messagesInput.quickReplies.hidePanel")
										: i18n.t("messagesInput.quickReplies.showPanel")
									: "Ação rápida"
							}
						>
							<span>
								<IconButton
									className={classes.topBarIcon}
									size="small"
									disabled={typeof onToggleQuickReplies !== "function"}
									onClick={() => onToggleQuickReplies?.()}
								>
									<FlashOnIcon fontSize="small" />
								</IconButton>
							</span>
						</Tooltip>
						<Tooltip title="Histórico">
							<IconButton className={classes.topBarIcon} size="small">
								<HistoryIcon fontSize="small" />
							</IconButton>
						</Tooltip>
						<Tooltip title="Configurações">
							<IconButton
								className={classes.topBarIcon}
								size="small"
								onClick={() => setModalOpen(true)}
							>
								<SettingsIcon fontSize="small" />
							</IconButton>
						</Tooltip>
					</div>
					<IconButton className={classes.topBarIcon} size="small" onClick={handleDrawerClose}>
						<CloseIcon fontSize="small" />
					</IconButton>
				</div>

				{loading ? (
					<ContactDrawerSkeleton classes={classes} />
				) : (
					<div className={classes.content}>
						{/* PROFILE SECTION */}
						<div className={classes.profileSection}>
							<Tooltip title="Compartilhar contato">
								<IconButton className={classes.shareIcon} size="small">
									<ShareIcon fontSize="small" />
								</IconButton>
							</Tooltip>
							<Avatar
								src={drawerAvatarSrc || undefined}
								alt={contact?.name || ""}
								onError={handleDrawerAvatarError}
								style={{
									width: 96,
									height: 96,
									marginBottom: 10,
									marginTop: 4,
									boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
								}}
							>
								{(contact?.name || "?").charAt(0).toUpperCase()}
							</Avatar>
						<Typography
							variant="h6"
							style={{
								fontWeight: 600,
								fontSize: 16,
								textAlign: "center",
								wordBreak: "break-word",
							}}
						>
							{contact?.name || ""}
						</Typography>
						<div className={classes.phoneRow}>
							<Typography
								className={classes.phoneNumber}
								style={
									phoneResolved.isInternalId && !phoneResolved.copyText
										? { fontSize: 12, fontWeight: 400, textAlign: "center" }
										: undefined
								}
							>
								{getDisplayNumber()}
							</Typography>
								{phoneResolved.copyText ? (
									<CopyToClipboard text={phoneResolved.copyText} onCopy={handleCopy}>
										<Tooltip title="Copiar número">
											<IconButton className={classes.copyIcon} size="small">
												<FileCopyIcon style={{ fontSize: 16 }} />
											</IconButton>
										</Tooltip>
									</CopyToClipboard>
								) : null}
							</div>
						</div>

						<Tabs
							value={activeTab}
							onChange={(_, v) => setActiveTab(v)}
							indicatorColor="primary"
							textColor="primary"
							variant="scrollable"
							scrollButtons="auto"
							className={classes.tabsRoot}
						>
							<Tab label="Contato" className={classes.tab} />
							<Tab label="Atendimento" className={classes.tab} />
						</Tabs>

						{/* ===== ABA 0: DETALHES DO CONTATO ===== */}
						{activeTab === 0 && (
						<div className={classes.formSection}>
							<Typography className={classes.sectionTitle}>
								Dados do Contato
							</Typography>

							{/* Nome */}
							<div className={classes.fieldRow}>
								<TextField
									label="Nome"
									value={formData.name}
									onChange={(e) => handleFieldChange("name", e.target.value)}
									variant="outlined"
									size="small"
									fullWidth
									InputProps={{
										endAdornment: (
											<InputAdornment position="end">
												<CreateIcon style={{ fontSize: 16, color: "#aaa" }} />
											</InputAdornment>
										),
									}}
								/>
							</div>

							{/* Email */}
							<TextField
								label="Email"
								value={formData.email}
								onChange={(e) => handleFieldChange("email", e.target.value)}
								variant="outlined"
								size="small"
								fullWidth
								placeholder="Digite o email do contato"
							/>

							<TextField
								label="Telefone / WhatsApp"
								value={formatPhoneBr(formData.phoneNumber)}
								onChange={(e) =>
									handleFieldChange(
										"phoneNumber",
										brDigitsOnly(e.target.value).slice(0, 13)
									)
								}
								variant="outlined"
								size="small"
								fullWidth
								placeholder="(DDD) número — com ou sem 55"
								style={{ marginTop: 8 }}
							/>
							<TextField
								label="CPF ou CNPJ"
								value={formatDocumentBr(formData.document)}
								onChange={(e) =>
									handleFieldChange(
										"document",
										brDigitsOnly(e.target.value).slice(0, 14)
									)
								}
								variant="outlined"
								size="small"
								fullWidth
								placeholder="000.000.000-00 ou 00.000.000/0000-00"
								style={{ marginTop: 8 }}
							/>

							<Typography variant="caption" color="textSecondary" style={{ display: "block", marginTop: 4 }}>
								Ao salvar, os dados são espelhados no card do Kanban (campos personalizados e nome do projeto quando ainda não definido).
							</Typography>

							<Divider style={{ margin: "8px 0" }} />

							<Typography className={classes.sectionTitle}>
								Endereço e localização
							</Typography>

							<TextField
								label="Logradouro"
								value={formData.addressStreet}
								onChange={(e) => handleFieldChange("addressStreet", e.target.value)}
								variant="outlined"
								size="small"
								fullWidth
								placeholder="Rua, avenida..."
							/>
							<div className={classes.fieldRow}>
								<TextField
									label="Número"
									value={formData.addressNumber}
									onChange={(e) => handleFieldChange("addressNumber", e.target.value)}
									variant="outlined"
									size="small"
									fullWidth
								/>
								<TextField
									label="Complemento"
									value={formData.addressComplement}
									onChange={(e) => handleFieldChange("addressComplement", e.target.value)}
									variant="outlined"
									size="small"
									fullWidth
								/>
							</div>
							<div className={classes.fieldRow}>
								<TextField
									label="Bairro"
									value={formData.addressDistrict}
									onChange={(e) => handleFieldChange("addressDistrict", e.target.value)}
									variant="outlined"
									size="small"
									fullWidth
								/>
								<TextField
									label="CEP"
									value={formData.addressZip}
									onChange={(e) => handleFieldChange("addressZip", e.target.value)}
									variant="outlined"
									size="small"
									fullWidth
									placeholder="00000-000"
								/>
							</div>
							<TextField
								label="Cidade"
								value={formData.city}
								onChange={(e) => handleFieldChange("city", e.target.value)}
								variant="outlined"
								size="small"
								fullWidth
							/>
							<div className={classes.fieldRow}>
								<TextField
									label="Estado (UF)"
									value={formData.state}
									onChange={(e) => handleFieldChange("state", e.target.value)}
									variant="outlined"
									size="small"
									fullWidth
								/>
								<TextField
									label="País"
									value={formData.country}
									onChange={(e) => handleFieldChange("country", e.target.value)}
									variant="outlined"
									size="small"
									fullWidth
								/>
							</div>

							<Divider style={{ margin: "8px 0" }} />

							{/* Origem do Lead */}
							<FormControl variant="outlined" size="small" fullWidth>
								<InputLabel>Origem do lead</InputLabel>
								<Select
									value={formData.leadOrigin}
									onChange={(e) => handleFieldChange("leadOrigin", e.target.value)}
									label="Origem do lead"
								>
									<MenuItem value="">
										<em>Selecione uma origem</em>
									</MenuItem>
									<MenuItem value="whatsapp">WhatsApp</MenuItem>
									<MenuItem value="facebook">Facebook</MenuItem>
									<MenuItem value="instagram">Instagram</MenuItem>
									<MenuItem value="site">Site</MenuItem>
									<MenuItem value="indicacao">Indicação</MenuItem>
									<MenuItem value="google">Google</MenuItem>
									<MenuItem value="outro">Outro</MenuItem>
								</Select>
							</FormControl>

							<Divider style={{ margin: "4px 0" }} />

							<Typography className={classes.sectionTitle}>
								Entrega
							</Typography>

							<TextField
								label="Data de entrega"
								type="date"
								value={formData.deliveryDate}
								onChange={(e) => handleFieldChange("deliveryDate", e.target.value)}
								variant="outlined"
								size="small"
								fullWidth
								InputLabelProps={{ shrink: true }}
							/>

							<Divider style={{ margin: "4px 0" }} />

							<Typography className={classes.sectionTitle}>
								Negócio
							</Typography>

							{/* Valor do Negócio */}
							<div className={classes.fieldRow}>
								<TextField
									label="Valor do Negócio"
									value={formData.dealValue}
									onChange={(e) => handleFieldChange("dealValue", e.target.value)}
									variant="outlined"
									size="small"
									fullWidth
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">R$</InputAdornment>
										),
									}}
								/>
							</div>

							{/* Empresa */}
							<TextField
								label="Empresa"
								value={formData.company}
								onChange={(e) => handleFieldChange("company", e.target.value)}
								variant="outlined"
								size="small"
								fullWidth
								placeholder="Adicione uma empresa"
							/>

							{/* Cargo */}
							<TextField
								label="Cargo"
								value={formData.position}
								onChange={(e) => handleFieldChange("position", e.target.value)}
								variant="outlined"
								size="small"
								fullWidth
								placeholder="Nome do cargo"
							/>

							<Divider style={{ margin: "4px 0" }} />

							<Typography className={classes.sectionTitle}>
								Produtos de Interesse
							</Typography>

							{/* Produtos */}
							<div className={classes.fieldRow}>
								<TextField
									label="Produto"
									value={formData.productInput}
									onChange={(e) => handleFieldChange("productInput", e.target.value)}
									onKeyPress={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											handleAddProduct();
										}
									}}
									variant="outlined"
									size="small"
									fullWidth
									placeholder="Digite um produto de interesse"
								/>
								<Button
									variant="outlined"
									color="primary"
									size="small"
									onClick={handleAddProduct}
									style={{ whiteSpace: "nowrap", minWidth: "auto" }}
								>
									+
								</Button>
							</div>

							{formData.products.length > 0 && (
								<div className={classes.chipContainer}>
									{formData.products.map((product, index) => (
										<span
											key={index}
											className={classes.productChip}
										>
											{product}
											<CloseIcon
												style={{ fontSize: 14, cursor: "pointer" }}
												onClick={() => handleRemoveProduct(index)}
											/>
										</span>
									))}
								</div>
							)}

							<Divider style={{ margin: "4px 0" }} />

							<div className={classes.sectionTitleRow}>
								<Typography className={classes.sectionTitle} style={{ margin: 0 }}>
									Observações do contato
								</Typography>
								<HelpHint areaKey="contact-drawer" />
							</div>
							<Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 6 }}>
								Histórico centralizado do cliente (inclui anotações que antes ficavam no ticket).
							</Typography>
							<TextField
								value={formData.observation}
								onChange={(e) => handleFieldChange("observation", e.target.value)}
								variant="outlined"
								size="small"
								fullWidth
								multiline
								rows={3}
								placeholder="Anotações gerais sobre o contato"
							/>

							{contactFinancial && (
								<Paper variant="outlined" style={{ padding: 12, marginTop: 12, borderRadius: 10 }}>
									<Typography variant="subtitle2" style={{ fontWeight: 600, marginBottom: 6 }}>
										Resumo financeiro
									</Typography>
									<Typography variant="caption" color="textSecondary" display="block">
										Receita: {formatBudgetBRL(contactFinancial.totalRevenue)} · Vendas:{" "}
										{contactFinancial.salesCount} · Aprovados:{" "}
										{contactFinancial.approvedBudgetsCount} · Pendentes:{" "}
										{contactFinancial.pendingBudgetsCount}
									</Typography>
								</Paper>
							)}

							{/* BOTÃO SALVAR TUDO */}
							<Button
								variant="contained"
								color="primary"
								size="small"
								fullWidth
								onClick={handleSaveAllContactFields}
								disabled={saving}
								style={{ marginTop: 8, fontWeight: 600 }}
							>
								{saving ? "Salvando..." : "Salvar dados do contato e sincronizar Kanban"}
							</Button>
						</div>
						)}

						{/* ===== ABA 1: ATENDIMENTO (ticket + processos + orçamentos + OS) ===== */}
						{activeTab === 1 && (
						<div className={classes.formSection}>
							<div className={classes.sectionTitleRow}>
								<Typography className={classes.sectionTitle} style={{ margin: 0 }}>
									Ticket
								</Typography>
								<HelpHint areaKey="tickets" />
							</div>
							<div className={classes.compactInfoGrid}>
								<TextField
									label="Protocolo"
									value={ticket?.id || "—"}
									variant="outlined"
									size="small"
									fullWidth
									InputProps={{ readOnly: true }}
								/>
								<TextField
									label="Status"
									value={ticket?.status || "—"}
									variant="outlined"
									size="small"
									fullWidth
									InputProps={{ readOnly: true }}
								/>
								<TextField
									label="Fila"
									value={ticket?.queue?.name || "Sem fila"}
									variant="outlined"
									size="small"
									fullWidth
									InputProps={{ readOnly: true }}
								/>
								<TextField
									label="Atendente"
									value={ticket?.user?.name || "Sem atendente"}
									variant="outlined"
									size="small"
									fullWidth
									InputProps={{ readOnly: true }}
								/>
							</div>

							<Button
								variant="outlined"
								color="primary"
								size="small"
								fullWidth
								startIcon={<ViewModuleIcon />}
								onClick={openKanbanDialog}
								disabled={!ticket?.id}
								style={{ marginTop: 10, marginBottom: 12 }}
							>
								Vincular ao Kanban e abrir quadro
							</Button>

							<Divider style={{ margin: "8px 0" }} />

							<div className={classes.sectionTitleRow}>
								<Typography className={classes.sectionTitle} style={{ margin: 0 }}>
									Participação nos fluxos
								</Typography>
								<HelpHint areaKey="kanban" />
							</div>
							<Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 8 }}>
								Estágio atual do contato em cada área de trabalho (visão Kanban).
							</Typography>
							<ContactParticipationKanban
								contact={contact}
								contactProcesses={contactProcesses}
								loading={loadingProcesses}
							/>

							<Divider style={{ margin: "12px 0" }} />

							<div className={classes.budgetSection}>
								<div className={classes.sectionTitleRow}>
									<Typography className={classes.sectionTitle} style={{ margin: 0 }}>
										Orçamentos
									</Typography>
									<HelpHint areaKey="budgets" />
								</div>
								<Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 10 }}>
									Todos os orçamentos deste contato. Propostas pendentes até aprovação pelo link público; ao aprovar, pode gerar OS automaticamente.
								</Typography>
								<div className={classes.actionBtnRow}>
									<Button
										variant="contained"
										color="primary"
										size="small"
										startIcon={<AddIcon />}
										disabled={!contact?.id}
										onClick={() => {
											setEditBudgetId(null);
											setBudgetModalOpen(true);
										}}
										style={{ flex: 1, fontWeight: 600 }}
									>
										Criar orçamento
									</Button>
									<Button
										variant="outlined"
										color="primary"
										size="small"
										startIcon={<AssignmentIcon />}
										disabled={!contact?.id}
										onClick={() => setOrderServiceModalOpen(true)}
										style={{ flex: 1, fontWeight: 600 }}
									>
										Criar OS
									</Button>
								</div>

								{loadingTicketBudgets ? (
									<div className={classes.processLoadingRow}>
										<CircularProgress size={24} />
									</div>
								) : ticketBudgets.length === 0 ? (
									<Paper variant="outlined" style={{ padding: 16, textAlign: "center", borderRadius: 10 }}>
										<Typography variant="body2" color="textSecondary">
											Nenhum orçamento para este contato ainda.
										</Typography>
									</Paper>
								) : (
									<>
										<Accordion
											className={classes.budgetAccordion}
											expanded={budgetPanelsOpen.pending}
											onChange={handleBudgetPanelToggle("pending")}
										>
											<AccordionSummary expandIcon={<ExpandMoreIcon />} className={classes.budgetAccordionSummary}>
												<Box display="flex" alignItems="center" style={{ gap: 8 }}>
													<FiberManualRecordIcon style={{ color: "#f9a825", fontSize: 16 }} />
													<Typography style={{ fontWeight: 600, fontSize: 13 }}>
														Pendentes ({groupedBudgets.pending.length})
													</Typography>
												</Box>
											</AccordionSummary>
											<AccordionDetails style={{ display: "block", padding: "8px 12px 12px" }}>
												{groupedBudgets.pending.length === 0 ? (
													<Typography variant="caption" color="textSecondary">
														Nenhum orçamento aguardando resposta.
													</Typography>
												) : (
													<div className={classes.budgetStrip}>
														{groupedBudgets.pending.map((b) => (
															<div key={b.id} className={classes.budgetStripItem}>
																{renderBudgetRow(b)}
															</div>
														))}
													</div>
												)}
											</AccordionDetails>
										</Accordion>

										<Accordion
											className={classes.budgetAccordion}
											expanded={budgetPanelsOpen.approved}
											onChange={handleBudgetPanelToggle("approved")}
										>
											<AccordionSummary expandIcon={<ExpandMoreIcon />} className={classes.budgetAccordionSummary}>
												<Box display="flex" alignItems="center" style={{ gap: 8 }}>
													<FiberManualRecordIcon style={{ color: "#2e7d32", fontSize: 16 }} />
													<Typography style={{ fontWeight: 600, fontSize: 13 }}>
														Aprovados ({groupedBudgets.approved.length})
													</Typography>
												</Box>
											</AccordionSummary>
											<AccordionDetails style={{ display: "block", padding: "8px 12px 12px" }}>
												{groupedBudgets.approved.length === 0 ? (
													<Typography variant="caption" color="textSecondary">
														Nenhum orçamento aprovado ainda.
													</Typography>
												) : (
													<div className={classes.budgetStrip}>
														{groupedBudgets.approved.map((b) => (
															<div key={b.id} className={classes.budgetStripItem}>
																{renderBudgetRow(b)}
															</div>
														))}
													</div>
												)}
											</AccordionDetails>
										</Accordion>

										<Accordion
											className={classes.budgetAccordion}
											expanded={budgetPanelsOpen.rejected}
											onChange={handleBudgetPanelToggle("rejected")}
										>
											<AccordionSummary expandIcon={<ExpandMoreIcon />} className={classes.budgetAccordionSummary}>
												<Box display="flex" alignItems="center" style={{ gap: 8 }}>
													<FiberManualRecordIcon style={{ color: "#c62828", fontSize: 16 }} />
													<Typography style={{ fontWeight: 600, fontSize: 13 }}>
														Recusados ({groupedBudgets.rejected.length})
													</Typography>
												</Box>
											</AccordionSummary>
											<AccordionDetails style={{ display: "block", padding: "8px 12px 12px" }}>
												{groupedBudgets.rejected.length === 0 ? (
													<Typography variant="caption" color="textSecondary">
														Nenhum orçamento recusado.
													</Typography>
												) : (
													<div className={classes.budgetStrip}>
														{groupedBudgets.rejected.map((b) => (
															<div key={b.id} className={classes.budgetStripItem}>
																{renderBudgetRow(b)}
															</div>
														))}
													</div>
												)}
											</AccordionDetails>
										</Accordion>
									</>
								)}
							</div>

							<Divider style={{ margin: "12px 0" }} />

							<div className={classes.sectionTitleRow}>
								<Typography className={classes.sectionTitle} style={{ margin: 0 }}>
									Ordens de serviço (OS)
								</Typography>
								<HelpHint areaKey="budgets" />
							</div>
							<Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 8 }}>
								OS vinculadas ao contato — inclui ordens abertas diretamente, sem orçamento prévio.
							</Typography>
							{loadingContactOrders ? (
								<div className={classes.processLoadingRow}>
									<CircularProgress size={22} />
								</div>
							) : contactOrders.length === 0 ? (
								<Typography variant="caption" color="textSecondary">
									Nenhuma OS registrada para este contato.
								</Typography>
							) : (
								<div className={classes.budgetStrip}>
									{contactOrders.map((ord) => (
										<Paper key={ord.id} elevation={0} className={`${classes.osRow} ${classes.budgetStripItem}`}>
											<Typography variant="subtitle2" style={{ fontWeight: 700, fontSize: 12 }}>
												{ord.orderNumber}
											</Typography>
											<Typography variant="caption" color="textSecondary" display="block">
												{formatBudgetBRL(ord.total)} · {ord.itemsCount} item(ns)
												{ord.budgetNumber ? ` · Orç. ${ord.budgetNumber}` : " · OS direta"}
											</Typography>
											{ord.createdAt && (
												<Typography variant="caption" color="textSecondary">
													{new Date(ord.createdAt).toLocaleDateString("pt-BR")}
												</Typography>
											)}
										</Paper>
									))}
								</div>
							)}
						</div>
						)}
					</div>
				)}
			</Drawer>

			<Dialog
				open={kanbanDialogOpen}
				onClose={() => !attachingKanban && setKanbanDialogOpen(false)}
				fullWidth
				maxWidth="xs"
			>
				<DialogTitle>Vincular ao Kanban e abrir quadro</DialogTitle>
				<DialogContent>
					{loadingKanbanMeta ? (
						<div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
							<CircularProgress size={28} />
						</div>
					) : (
						<>
							<FormControl variant="outlined" size="small" fullWidth style={{ marginBottom: 16, marginTop: 4 }}>
								<InputLabel id="cd-quadro-group-label">Área de trabalho</InputLabel>
								<Select
									labelId="cd-quadro-group-label"
									label="Área de trabalho"
									value={selectedQuadroGroupId}
									onChange={(e) => setSelectedQuadroGroupId(e.target.value)}
								>
									<MenuItem value="">
										<em>Selecione…</em>
									</MenuItem>
									{quadroGroups.map((g) => (
										<MenuItem key={g.id} value={String(g.id)}>
											{g.name || `Área #${g.id}`}
										</MenuItem>
									))}
								</Select>
							</FormControl>
							<TextField
								fullWidth
								variant="outlined"
								size="small"
								label="Nome do ticket/card"
								placeholder="Ex.: Orçamento Cliente XPTO"
								value={kanbanNomeProjeto}
								onChange={(e) => setKanbanNomeProjeto(e.target.value)}
								style={{ marginBottom: 16 }}
							/>
							<FormControl variant="outlined" size="small" fullWidth>
								<InputLabel id="cd-kanban-tag-label">Etapa inicial (coluna)</InputLabel>
								<Select
									labelId="cd-kanban-tag-label"
									label="Etapa inicial (coluna)"
									value={selectedKanbanTagId}
									onChange={(e) => setSelectedKanbanTagId(e.target.value)}
								>
									<MenuItem value="">
										<em>Manter / não alterar</em>
									</MenuItem>
									{kanbanTags.map((t) => (
										<MenuItem key={t.id} value={t.id}>
											{t.name}
										</MenuItem>
									))}
								</Select>
							</FormControl>
							<Typography variant="caption" color="textSecondary" style={{ display: "block", marginTop: 12 }}>
								Cada cliente fica em apenas 1 quadro por vez. Escolher outro quadro move este ticket para lá.
								Para outra equipe atender em paralelo, crie um cartão direto pela área Kanban daquele quadro.
							</Typography>
						</>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setKanbanDialogOpen(false)} disabled={attachingKanban}>
						Cancelar
					</Button>
					<Button
						color="primary"
						variant="contained"
						onClick={handleConfirmKanbanLink}
						disabled={attachingKanban || loadingKanbanMeta || !selectedQuadroGroupId}
					>
						{attachingKanban ? "Salvando…" : "Confirmar e abrir quadro"}
					</Button>
				</DialogActions>
			</Dialog>

			<QuadroModal
				open={quadroModalOpen}
				onClose={() => setQuadroModalOpen(false)}
				ticketUuid={ticket?.uuid}
				readOnly={false}
				quadroGroupId={ticket?.quadroGroupId != null && ticket?.quadroGroupId !== "" ? ticket.quadroGroupId : selectedQuadroGroupId}
				onOpenChat={() => {
					if (ticket?.id) {
						setQuadroModalOpen(false);
						history.push(`/tickets/${ticket.id}`);
					}
				}}
				onQuadroUpdated={typeof refreshTicket === "function" ? refreshTicket : undefined}
			/>

			<ContactModal
				open={modalOpen}
				onClose={() => setModalOpen(false)}
				contactId={contact?.id}
			/>

			<Dialog
				open={rejectBudgetDialog.open}
				onClose={() => {
					if (budgetAgentLoadingId != null) return;
					setRejectBudgetDialog({ open: false, budget: null });
				}}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle>Recusar orçamento</DialogTitle>
				<DialogContent>
					<Typography variant="body2" color="textSecondary" paragraph>
						O status será alterado para <strong>Recusado</strong>. Opcional: informe o motivo.
					</Typography>
					<TextField
						fullWidth
						multiline
						minRows={3}
						variant="outlined"
						label="Motivo (opcional)"
						value={rejectReason}
						onChange={(e) => setRejectReason(e.target.value)}
						placeholder="Ex.: cliente optou por outro fornecedor"
					/>
				</DialogContent>
				<DialogActions>
					<Tooltip title="Cancelar">
						<span>
							<IconButton
								size="small"
								onClick={() => setRejectBudgetDialog({ open: false, budget: null })}
								disabled={budgetAgentLoadingId != null}
								aria-label="Cancelar"
							>
								<CloseIcon fontSize="small" />
							</IconButton>
						</span>
					</Tooltip>
					<Tooltip title={budgetAgentLoadingId != null ? "Salvando…" : "Confirmar recusa"}>
						<span>
							<IconButton
								size="small"
								onClick={handleRejectBudgetAgentConfirm}
								disabled={budgetAgentLoadingId != null}
								aria-label="Confirmar recusa"
								style={{ color: "#c62828" }}
							>
								{budgetAgentLoadingId != null ? (
									<CircularProgress size={18} style={{ color: "#c62828" }} />
								) : (
									<ThumbDownIcon fontSize="small" />
								)}
							</IconButton>
						</span>
					</Tooltip>
				</DialogActions>
			</Dialog>

			<Dialog
				open={orderDetailOpen}
				onClose={() => {
					setOrderDetailOpen(false);
					setOrderDetailData(null);
				}}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>Ordem de serviço (OS)</DialogTitle>
				<DialogContent dividers>
					{orderDetailLoading ? (
						<Box display="flex" justifyContent="center" py={3}>
							<CircularProgress />
						</Box>
					) : orderDetailData?.order ? (
						<>
							<Alert severity="success" style={{ marginBottom: 16 }}>
								OS vinculada ao orçamento Nº {orderDetailData.budgetNumber}.
							</Alert>
							<Typography variant="subtitle2" gutterBottom>
								{orderDetailData.order.orderNumber}
							</Typography>
							<Typography variant="body2" color="textSecondary" paragraph>
								Total:{" "}
								<strong>
									{formatBudgetBRL(
										orderDetailData.order.total != null ? orderDetailData.order.total : 0
									)}
								</strong>
							</Typography>
							<Divider style={{ margin: "12px 0" }} />
							<Typography variant="caption" color="textSecondary" display="block" gutterBottom>
								Itens
							</Typography>
							{Array.isArray(orderDetailData.order.items) &&
							orderDetailData.order.items.length > 0 ? (
								orderDetailData.order.items.map((it, idx) => (
									<Typography key={idx} variant="body2" style={{ marginBottom: 6 }}>
										{it.description || it.code || "Item"} · Qtd {it.qty ?? "—"} ·{" "}
										{formatBudgetBRL(it.total != null ? it.total : 0)}
									</Typography>
								))
							) : (
								<Typography variant="body2" color="textSecondary">
									—
								</Typography>
							)}
						</>
					) : (
						<Typography variant="body2" color="textSecondary">
							Nenhuma OS encontrada para este orçamento.
						</Typography>
					)}
				</DialogContent>
				<DialogActions>
					{orderDetailData?.order && orderDetailData?.payload ? (
						<>
							<Button
								variant="outlined"
								color="primary"
								startIcon={<GetAppIcon />}
								disabled={osPdfLoadingBudgetId === orderDetailData.id}
								onClick={() => queueOsPdfDownload({ id: orderDetailData.id })}
							>
								PDF da OS
							</Button>
							{ticket?.id && contact?.id ? (
								<Button
									variant="outlined"
									style={{ color: "#25d366", borderColor: "#25d366" }}
									startIcon={<SendIcon />}
									disabled={osPdfLoadingBudgetId === orderDetailData.id}
									onClick={() => queueOsPdfSendWhatsApp({ id: orderDetailData.id })}
								>
									WhatsApp
								</Button>
							) : null}
						</>
					) : null}
					<Button
						onClick={() => {
							setOrderDetailOpen(false);
							setOrderDetailData(null);
						}}
						color="primary"
						variant="contained"
					>
						Fechar
					</Button>
				</DialogActions>
			</Dialog>

			{contact?.id && (
				<>
					<BudgetOrcamentoModal
						open={budgetModalOpen}
						onClose={() => {
							setBudgetModalOpen(false);
							setEditBudgetId(null);
						}}
						ticket={ticket}
						contact={contact}
						user={user}
						editBudgetId={editBudgetId}
						onAfterSave={reloadBudgetsAndOrders}
					/>
					<OrderServiceModal
						open={orderServiceModalOpen}
						onClose={() => setOrderServiceModalOpen(false)}
						ticket={ticket}
						contact={contact}
						onAfterSave={reloadBudgetsAndOrders}
					/>
				</>
			)}
		</>
	);
};

export default ContactDrawer;
