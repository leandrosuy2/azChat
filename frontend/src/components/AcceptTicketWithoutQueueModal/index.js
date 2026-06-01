import React, { useState, useContext, useEffect } from "react";
import { useHistory } from "react-router-dom";

import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormHelperText,
    InputLabel,
    makeStyles,
    MenuItem,
    Select,
    Typography,
 } from "@material-ui/core";
import GroupIcon from "@material-ui/icons/Group";

import ConnectionIcon from "../ConnectionIcon";

import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import ButtonWithSpinner from "../ButtonWithSpinner";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import ShowTicketOpen from "../ShowTicketOpenModal";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import { TicketsContext } from "../../context/Tickets/TicketsContext";

// const filter = createFilterOptions({
// 	trim: true,
// });

const useStyles = makeStyles((theme) => ({
	autoComplete: { 
		width: 300,
		// marginBottom: 20 
	},
	maxWidth: {
		width: "100%",
	},
	buttonColorError: {
		color: theme.palette.error.main,
		borderColor: theme.palette.error.main,
	},
	/** Linha do setor: ícone do canal + nome (menu aberto e campo fechado). */
	selectMenuRow: {
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(1),
		minHeight: 28,
		width: "100%",
	},
	selectMenuIcon: {
		display: "inline-flex",
		alignItems: "center",
		flexShrink: 0,
	},
}));

const AcceptTicketWithouSelectQueue = ({ modalOpen, onClose, ticketId, ticket }) => {
	const history = useHistory();
	const classes = useStyles();
	const [selectedQueue, setSelectedQueue] = useState('');
	const [loading, setLoading] = useState(false);
	const [queuesForSelect, setQueuesForSelect] = useState([]);
	const [loadingQueues, setLoadingQueues] = useState(false);
	const { user } = useContext(AuthContext);
	const [ openAlert, setOpenAlert ] = useState(false);
	const [ userTicketOpen, setUserTicketOpen] = useState("");
	const [ queueTicketOpen, setQueueTicketOpen] = useState("");
	const { setTabOpen } = useContext(TicketsContext);

	const {get:getSetting} = useCompanySettings();

	useEffect(() => {
		if (!modalOpen) {
			setSelectedQueue("");
			setQueuesForSelect([]);
			return;
		}

		const fromUser = user?.queues;
		if (fromUser?.length) {
			setQueuesForSelect(fromUser);
			setSelectedQueue(fromUser.length === 1 ? fromUser[0].id : "");
			return;
		}

		let cancelled = false;
		setLoadingQueues(true);
		(async () => {
			try {
				const { data } = await api.get("/queue");
				if (cancelled || !Array.isArray(data)) return;
				setQueuesForSelect(data);
				if (data.length === 1) setSelectedQueue(data[0].id);
			} catch (err) {
				toastError(err);
			} finally {
				if (!cancelled) setLoadingQueues(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [modalOpen, user]);

const handleClose = () => {
	onClose();
	setSelectedQueue("");
};

const handleCloseAlert = () => {
	setOpenAlert(false);
	setLoading(false)
};

const handleSendMessage = async (id) => {

	let isGreetingMessage = false;

	try {
		const  setting  = await getSetting({
			"column":"sendGreetingAccepted"
		});
		if (setting.sendGreetingAccepted === "enabled") isGreetingMessage = true;
	} catch (err) {
		toastError(err);
	}
	
	let settingMessage
	try {
		settingMessage = await getSetting({
			"column": "greetingAcceptedMessage"
		})
	} catch (err) {
		toastError(err);
	}
	
	// console.log(ticket)
	if (isGreetingMessage && (!ticket.isGroup || ticket.whatsapp?.groupAsTicket === "enabled") && ticket.status === "pending") {
		const msg = `${settingMessage?.greetingAcceptedMessage ?? ""}`.trim();
		if (!msg) return;
		const message = {
			read: 1,
			fromMe: true,
			mediaUrl: "",
			body: msg,
		};
		try {
			await api.post(`/messages/${id}`, message);
		} catch (err) {
			toastError(err);
		}
	}
};

const handleUpdateTicketStatus = async (queueId) => {
	setLoading(true);
	try {
		const otherTicket = await api.put(`/tickets/${ticketId}`, {
			status: ticket.isGroup && ticket.channel === 'whatsapp' ? "group" : "open",
			userId: user?.id || null,
			queueId: queueId
		});

		if (otherTicket.data.id !== ticket.id) {
			if (otherTicket.data.userId !== user?.id) {
				setOpenAlert(true)
				setUserTicketOpen(otherTicket.data.user.name)
				setQueueTicketOpen(otherTicket.data.queue.name)
			} else {
				setLoading(false);
				setTabOpen(otherTicket.isGroup ? "group" : "open");
				history.push(`/tickets/${otherTicket.data.uuid}`);
			}
		} else {
			handleSendMessage(ticket.id)
			setLoading(false);
			setTabOpen(ticket.isGroup ? "group" : "open");
			history.push(`/tickets/${ticket.uuid}`);
			handleClose();
		}
	} catch (err) {
		setLoading(false);
		toastError(err);
	}
};

return (
	<>
		<Dialog open={modalOpen} onClose={handleClose}>
			<DialogTitle id="form-dialog-title">
				{i18n.t("ticketsList.acceptModal.title")}
			</DialogTitle>
			<DialogContent dividers>
				<FormControl variant="outlined" className={classes.maxWidth} disabled={loadingQueues}>
					<InputLabel>{i18n.t("ticketsList.acceptModal.queue")}</InputLabel>
					<Select
						value={selectedQueue}
						className={classes.autoComplete}
						displayEmpty
						onChange={(e) => setSelectedQueue(e.target.value)}
						label={i18n.t("ticketsList.acceptModal.queue")}
						renderValue={(value) => {
							const empty = value === "" || value === undefined || value === null;
							const q = !empty && queuesForSelect.find((x) => String(x.id) === String(value));
							if (empty) return "";
							return (
								<Box className={classes.selectMenuRow} component="span">
									<span className={classes.selectMenuIcon}>
										<ConnectionIcon connectionType={ticket?.channel} fontSize="small" />
										{ticket?.isGroup && ticket?.channel === "whatsapp" && (
											<GroupIcon
												style={{
													fontSize: 18,
													marginLeft: 4,
													color: "#546e7a",
													verticalAlign: "middle",
												}}
											/>
										)}
									</span>
									<Typography variant="body2" noWrap component="span">
										{q?.name ?? ""}
									</Typography>
								</Box>
							);
						}}
					>
						<MenuItem value="">
							<Box className={classes.selectMenuRow} component="span">
								<span className={classes.selectMenuIcon}>
									<ConnectionIcon connectionType={ticket?.channel} fontSize="small" />
									{ticket?.isGroup && ticket?.channel === "whatsapp" && (
										<GroupIcon style={{ fontSize: 18, marginLeft: 4, color: "#546e7a", verticalAlign: "middle" }} />
									)}
								</span>
								<Typography variant="body2" color="textSecondary" component="span">
									<em>{i18n.t("ticketsList.acceptModal.queue")}</em>
								</Typography>
							</Box>
						</MenuItem>
						{queuesForSelect.map((queue) => (
							<MenuItem key={queue.id} value={queue.id}>
								<Box className={classes.selectMenuRow} component="span">
									<span className={classes.selectMenuIcon}>
										<ConnectionIcon connectionType={ticket?.channel} fontSize="small" />
										{ticket?.isGroup && ticket?.channel === "whatsapp" && (
											<GroupIcon style={{ fontSize: 18, marginLeft: 4, color: "#546e7a", verticalAlign: "middle" }} />
										)}
									</span>
									<Typography variant="body2" noWrap component="span">
										{queue.name}
									</Typography>
								</Box>
							</MenuItem>
						))}
					</Select>
					{loadingQueues && (
						<FormHelperText>Carregando setores…</FormHelperText>
					)}
					{!loadingQueues && queuesForSelect.length === 0 && (
						<Typography variant="body2" color="error" style={{ marginTop: 8 }}>
							Nenhum setor disponível. Peça ao administrador para vincular filas ao seu usuário ou cadastrar setores na empresa.
						</Typography>
					)}
				</FormControl>
			</DialogContent>
			<DialogActions>
				<Button
					onClick={handleClose}
					className={classes.buttonColorError}
					disabled={loading}
					variant="outlined"
				>
					{i18n.t("ticketsList.buttons.cancel")}
				</Button>
				<ButtonWithSpinner
					variant="contained"
					type="button"
					disabled={selectedQueue === "" || loadingQueues || queuesForSelect.length === 0}
					onClick={() => handleUpdateTicketStatus(selectedQueue)}
					color="primary"
					loading={loading}
				>
					{i18n.t("ticketsList.buttons.start")}
				</ButtonWithSpinner>
			</DialogActions>
			<ShowTicketOpen
				isOpen={openAlert}
				handleClose={handleCloseAlert}
				user={userTicketOpen}
				queue={queueTicketOpen}
			/>
		</Dialog>
	</>
);
};

export default AcceptTicketWithouSelectQueue;