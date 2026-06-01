import React, { useState, useCallback, useContext, useEffect, useLayoutEffect, useRef } from "react";
import { useParams, useHistory } from "react-router-dom";
import Paper from "@material-ui/core/Paper";
import Hidden from "@material-ui/core/Hidden";
import { makeStyles } from "@material-ui/core/styles";
import TicketsManager from "../../components/TicketsManagerTabs";
import Ticket from "../../components/Ticket";

import { QueueSelectedProvider } from "../../context/QueuesSelected/QueuesSelectedContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import { CircularProgress } from "@material-ui/core";
import { getBackendUrl } from "../../config";
import logo from "../../assets/logo.png";
import logoDark from "../../assets/logo-black.png";

const defaultTicketsManagerWidth = 400;
const minTicketsManagerWidth = 320;
const maxTicketsManagerWidth = 560;
/** Largura mínima reservada para o painel do chat (evita sumir ao arrastar). */
const minChatPanelPx = 260;

const LOG = "[TicketsCustom]";

/** Console em dev. Desliga: `localStorage.setItem('DEBUG_TICKETS','0'); location.reload()` */
const tdlog = (...args) => {
	if (process.env.NODE_ENV !== "development") return;
	if (typeof window !== "undefined" && localStorage.getItem("DEBUG_TICKETS") === "0") return;
	// eslint-disable-next-line no-console
	console.log("[TicketsDebug]", ...args);
};

const useStyles = makeStyles((theme) => ({
	chatContainer: {
		flex: 1,
		minHeight: 0,
		minWidth: 0,
		padding: "2px",
		overflowY: "hidden",
		display: "flex",
		flexDirection: "column",
		boxSizing: "border-box",
	},
	chatPapper: {
		display: "flex",
		flexDirection: "row",
		flex: 1,
		minHeight: 0,
		minWidth: 0,
		height: "100%",
		overflow: "hidden",
		alignItems: "stretch",
	},
	contactsWrapper: {
		display: "flex",
		height: "100%",
		minHeight: 0,
		flexShrink: 0,
		flexDirection: "column",
		overflowY: "hidden",
		overflowX: "hidden",
		position: "relative",
		boxSizing: "border-box",
	},
	messagesWrapper: {
		display: "flex",
		height: "100%",
		minHeight: 0,
		minWidth: 0,
		flex: "1 1 0%",
		flexDirection: "column",
		overflow: "hidden",
		position: "relative",
	},
	welcomeMsg: {
		background: theme.palette.tabHeaderBackground,
		display: "flex",
		justifyContent: "space-evenly",
		alignItems: "center",
		height: "100%",
		textAlign: "center",
	},
	dragger: {
		width: "8px",
		cursor: "ew-resize",
		padding: "4px 0 0",
		borderTop: "1px solid #ddd",
		position: "absolute",
		top: 0,
		right: 0,
		bottom: 0,
		zIndex: 1300,
		backgroundColor: "#f4f7f9",
		userSelect: "none",
		touchAction: "none",
		pointerEvents: "auto",
	},
	logo: {
		logo: theme.logo,
		content: "url(" + (theme.mode === "light" ? theme.calculatedLogoLight() : theme.calculatedLogoDark()) + ")"
	},
}));

const TicketsCustom = () => {
	const { user } = useContext(AuthContext);

	const classes = useStyles({ ticketsManagerWidth: user.defaultTicketsManagerWidth || defaultTicketsManagerWidth });

	const { ticketId } = useParams();

	const initialWidth =
		user?.defaultTicketsManagerWidth &&
		user.defaultTicketsManagerWidth >= minTicketsManagerWidth &&
		user.defaultTicketsManagerWidth <= maxTicketsManagerWidth
			? user.defaultTicketsManagerWidth
			: defaultTicketsManagerWidth;

	const [ticketsManagerWidth, setTicketsManagerWidth] = useState(initialWidth);
	const ticketsManagerWidthRef = useRef(initialWidth);
	const chatPapperRef = useRef(null);
	const lastSavedWidthRef = useRef(initialWidth);
	const lastDragLogAtRef = useRef(0);
	const clampPanelWidthRef = useRef(
		/** placeholder até o primeiro useCallback */
		(raw) => Math.min(Math.max(raw, minTicketsManagerWidth), maxTicketsManagerWidth)
	);

	/** Largura da lista: relativa ao painel (getBoundingClientRect), nunca come o chat inteiro. */
	const clampPanelWidth = useCallback((rawWidth) => {
		const minW = minTicketsManagerWidth;
		const maxCap = maxTicketsManagerWidth;
		const el = chatPapperRef.current;
		if (!el) {
			return Math.min(Math.max(rawWidth, minW), maxCap);
		}
		const rect = el.getBoundingClientRect();
		const spaceForList = rect.width - minChatPanelPx;
		const upper = Math.min(maxCap, Math.max(0, spaceForList));
		if (upper <= 0) {
			/** Antes: `rect.width - 200` podia dar 0 — lista sumia até dar F5. Mantém faixa usável mínima. */
			const fallback = Math.min(maxCap, Math.max(200, rect.width - minChatPanelPx));
			tdlog("TicketsCustom: clampPanelWidth ramo upper<=0", {
				rawWidth,
				rectW: Math.round(rect.width),
				spaceForList: Math.round(spaceForList),
				fallback: Math.round(fallback),
			});
			return fallback;
		}
		/**
		 * Se upper < minW, `Math.min(max(raw, min(upper,minW)), upper)` virava sempre `upper` → arraste não mudava nada.
		 * Usamos um piso menor só nesse caso para manter uma faixa arrastável real.
		 */
		let lower = minW;
		if (upper < minW) {
			lower = Math.max(200, Math.floor(upper * 0.55));
			if (lower >= upper) {
				lower = Math.max(150, upper - 32);
			}
		}
		return Math.min(Math.max(rawWidth, lower), upper);
	}, []);

	useLayoutEffect(() => {
		clampPanelWidthRef.current = clampPanelWidth;
	}, [clampPanelWidth]);

	useEffect(() => {
		if (!user) return;
		const w = user.defaultTicketsManagerWidth;
		if (w != null && w >= minTicketsManagerWidth && w <= maxTicketsManagerWidth) {
			const next = clampPanelWidth(w);
			setTicketsManagerWidth(next);
			ticketsManagerWidthRef.current = next;
			lastSavedWidthRef.current = next;
		} else {
			const next = clampPanelWidth(defaultTicketsManagerWidth);
			setTicketsManagerWidth(next);
			ticketsManagerWidthRef.current = next;
			lastSavedWidthRef.current = next;
		}
	}, [user, clampPanelWidth]);

	/** Janela ou mudança de largura do painel (drawer, layout) — mantém lista + chat coerentes. */
	useEffect(() => {
		const onResize = () => {
			setTicketsManagerWidth((prev) => {
				const next = clampPanelWidth(prev);
				const el = chatPapperRef.current;
				const r = el?.getBoundingClientRect();
				tdlog("TicketsCustom: janela ou ResizeObserver (chatPapper)", {
					prevLarguraLista: prev,
					nextLarguraLista: next,
					manteveLargura: Math.round(next) === Math.round(prev),
					chatPapperPx: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
				});
				if (Math.round(next) === Math.round(prev)) {
					ticketsManagerWidthRef.current = prev;
					return prev;
				}
				ticketsManagerWidthRef.current = next;
				return next;
			});
		};

		onResize();
		window.addEventListener("resize", onResize);
		const el = chatPapperRef.current;
		let ro;
		let roTimer;
		if (el && typeof ResizeObserver !== "undefined") {
			ro = new ResizeObserver(() => {
				clearTimeout(roTimer);
				roTimer = setTimeout(() => onResize(), 50);
			});
			ro.observe(el);
		}
		return () => {
			clearTimeout(roTimer);
			window.removeEventListener("resize", onResize);
			if (ro) ro.disconnect();
		};
	}, [clampPanelWidth]);

	const handleSaveContact = useCallback(async (value) => {
		const v = value < minTicketsManagerWidth ? minTicketsManagerWidth : value;
		await api.put(`/users/toggleChangeWidht/${user.id}`, { defaultTicketsManagerWidth: v });
	}, [user?.id]);

	const handleMouseMoveDrag = useCallback((e) => {
		const el = chatPapperRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const raw = e.clientX - rect.left;
		const next = clampPanelWidthRef.current(raw);
		ticketsManagerWidthRef.current = next;
		setTicketsManagerWidth(next);
		const now = Date.now();
		if (now - lastDragLogAtRef.current > 250) {
			lastDragLogAtRef.current = now;
			tdlog("TicketsCustom: arrastar divisória lista/chat", {
				rawDesdeBordaEsquerda: Math.round(raw),
				larguraListaAplicada: Math.round(next),
				chatPapperPx: { w: Math.round(rect.width), h: Math.round(rect.height) },
			});
		}
	}, []);

	const handleMouseUpDrag = useCallback(() => {
		document.removeEventListener("mouseup", handleMouseUpDrag, true);
		document.removeEventListener("mousemove", handleMouseMoveDrag, true);

		const w = ticketsManagerWidthRef.current;
		const prevSaved = lastSavedWidthRef.current;

		if (Math.round(w) !== Math.round(prevSaved)) {
			lastSavedWidthRef.current = w;
			handleSaveContact(w).catch((err) => {
				console.error(LOG, "erro ao salvar largura", err);
			});
		}
	}, [handleSaveContact]);

	const handleMouseDown = (e) => {
		e.preventDefault();
		document.addEventListener("mouseup", handleMouseUpDrag, true);
		document.addEventListener("mousemove", handleMouseMoveDrag, true);
	};

	return (
		<QueueSelectedProvider>
			<div className={classes.chatContainer}>
				<div ref={chatPapperRef} className={classes.chatPapper}>
					<div
						className={classes.contactsWrapper}
						style={{ width: ticketsManagerWidth }}
					>
						<TicketsManager />
						<div onMouseDown={e => handleMouseDown(e)} className={classes.dragger} />
					</div>
					<div className={classes.messagesWrapper}>
						{ticketId ? (
							<Ticket />
						) : (
							<Hidden only={["sm", "xs"]}>
								<Paper square variant="outlined" className={classes.welcomeMsg}>
									<span>
										<center>
											<img className={classes.logo} width="50%" alt="" />
										</center>
										{i18n.t("chat.noTicketMessage")}
									</span>								</Paper>
							</Hidden>
						)}
					</div>
				</div>
			</div>
		</QueueSelectedProvider>
	);
};

export default TicketsCustom;