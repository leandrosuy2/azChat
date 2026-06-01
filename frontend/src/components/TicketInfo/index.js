import React, { useMemo, useState, useEffect, useCallback } from "react";
import { i18n } from "../../translate/i18n";
import { Avatar, Box, Divider, IconButton, Typography } from "@material-ui/core";
import Tooltip from "@material-ui/core/Tooltip";
import PersonOutline from "@material-ui/icons/PersonOutline";
import Edit from "@material-ui/icons/Edit";
import CloseIcon from "@material-ui/icons/Close";
import toastError from "../../errors/toastError";
import api from "../../services/api";

const MAX_ORDER = 2147483647;

/** Etapas só de filtro na inbox (tag.kanban === 2 no contato) — funil na inbox. */
const contactInboxFunnelTags = (contact) => {
	const list = Array.isArray(contact?.tags) ? contact.tags : [];
	return list
		.filter((t) => Number(t?.kanban) === 2)
		.sort((a, b) => {
			const oa = a.inboxOrder != null ? Number(a.inboxOrder) : MAX_ORDER;
			const ob = b.inboxOrder != null ? Number(b.inboxOrder) : MAX_ORDER;
			if (oa !== ob) return oa - ob;
			return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
				sensitivity: "base",
			});
		});
};

const TicketInfo = ({ contact, ticket, onClick }) => {
	const funnelContactTags = useMemo(() => contactInboxFunnelTags(contact), [contact?.tags]);

	/** Nome do funil: apenas etapas do funil no contato (kanban=2). */
	const funnelDisplay = useMemo(() => {
		if (!funnelContactTags.length) return null;
		return funnelContactTags.map((t) => t.name).filter(Boolean).join(", ");
	}, [funnelContactTags]);
	const primaryFunnelTag = funnelContactTags[0] || null;

	const name = contact?.name || "(sem contato)";

	const [headerAvatarSrc, setHeaderAvatarSrc] = useState(
		() => contact?.urlPicture || contact?.profilePicUrl || undefined
	);

	useEffect(() => {
		setHeaderAvatarSrc(contact?.urlPicture || contact?.profilePicUrl || undefined);
	}, [contact?.id, contact?.urlPicture, contact?.profilePicUrl]);

	const onHeaderAvatarError = useCallback(() => {
		const c = contact;
		if (!c) return;
		setHeaderAvatarSrc((prev) => {
			if (prev && c.urlPicture && prev === c.urlPicture && c.profilePicUrl && c.profilePicUrl !== c.urlPicture) {
				return c.profilePicUrl;
			}
			return undefined;
		});
	}, [contact]);

	const handleRemoveFunnel = useCallback(async (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (!contact?.id || !primaryFunnelTag?.id) return;
		try {
			await api.delete(`/tags-contacts/${primaryFunnelTag.id}/${contact.id}`);
		} catch (err) {
			toastError(err);
		}
	}, [contact?.id, primaryFunnelTag?.id]);

	return (
		<React.Fragment>
			<Box
				display="flex"
				alignItems="stretch"
				flex={1}
				minWidth={0}
				width="100%"
				onClick={onClick}
				style={{ cursor: "pointer" }}
			>
				<Box flex="1 1 160px" minWidth={0}>
					<Box display="flex" alignItems="flex-start" py={0.25} pr={1}>
						<Avatar
							src={headerAvatarSrc || undefined}
							alt={name}
							onError={onHeaderAvatarError}
							style={{ width: 40, height: 40, marginRight: 10, flexShrink: 0 }}
						>
							{(name || "?").charAt(0).toUpperCase()}
						</Avatar>
						<Box minWidth={0} flex={1}>
							<Box
								display="flex"
								alignItems="center"
								minWidth={0}
								style={{ gap: 4 }}
							>
								<PersonOutline fontSize="small" style={{ flexShrink: 0, opacity: 0.8 }} />
								<Typography
									variant="subtitle1"
									component="div"
									noWrap
									title={`${name} #${ticket.id}`}
									style={{ fontWeight: 600, minWidth: 0 }}
								>
									{name} #{ticket.id}
								</Typography>
								<Edit fontSize="small" style={{ flexShrink: 0, opacity: 0.7 }} />
							</Box>
							<Typography
								variant="caption"
								color="textSecondary"
								display="block"
								noWrap
								title={
									ticket.user?.name
										? `${i18n.t("messagesList.header.assignedTo")} ${ticket.user.name}`
										: i18n.t("messagesList.header.notAssigned")
								}
							>
								{ticket.user?.name
									? `${i18n.t("messagesList.header.assignedTo")} ${ticket.user.name}`
									: i18n.t("messagesList.header.notAssigned")}
							</Typography>
						</Box>
					</Box>
				</Box>

				<Divider orientation="vertical" flexItem style={{ margin: "6px 0" }} />

				<Box
					flex="1 1 140px"
					minWidth={0}
					display="flex"
					flexDirection="column"
					justifyContent="center"
					py={0.25}
					pl={1}
					pr={0.5}
				>
					{funnelDisplay ? (
						<Box>
							<Typography
								variant="caption"
								color="textSecondary"
								component="div"
								style={{ lineHeight: 1.2, textTransform: "none" }}
							>
								{i18n.t("messagesList.header.funnelLabel")}
							</Typography>
							<Box display="flex" alignItems="center" minWidth={0} style={{ gap: 4 }}>
								<Tooltip title={funnelDisplay}>
									<Typography
										variant="body2"
										component="div"
										style={{
											fontWeight: 700,
											lineHeight: 1.3,
											wordBreak: "break-word",
											overflowWrap: "anywhere",
											minWidth: 0,
										}}
									>
										{funnelDisplay}
									</Typography>
								</Tooltip>
								<Tooltip title="Remover do funil">
									<IconButton
										size="small"
										aria-label="Remover do funil"
										onClick={handleRemoveFunnel}
										style={{ padding: 2, flexShrink: 0 }}
									>
										<CloseIcon style={{ fontSize: 14 }} />
									</IconButton>
								</Tooltip>
							</Box>
						</Box>
					) : (
						<Typography variant="body2" color="textSecondary" component="div">
							—
						</Typography>
					)}
				</Box>
			</Box>
		</React.Fragment>
	);
};

export default TicketInfo;
