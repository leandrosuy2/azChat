import React, { useState, useEffect, useContext } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import { Colorize } from "@material-ui/icons";
import { ColorBox } from "material-ui-color";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import {
	Box,
	Checkbox,
	Divider,
	FormControl,
	FormControlLabel,
	FormHelperText,
	IconButton,
	InputAdornment,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	Typography,
} from "@material-ui/core";
import { Grid } from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
	root: {
		display: "flex",
		flexWrap: "wrap",
	},
	multFieldLine: {
		display: "flex",
		"& > *:not(:last-child)": {
			marginRight: theme.spacing(1),
		},
	},
	btnWrapper: {
		position: "relative",
	},
	buttonProgress: {
		color: green[500],
		position: "absolute",
		top: "50%",
		left: "50%",
		marginTop: -12,
		marginLeft: -12,
	},
	colorAdorment: {
		width: 20,
		height: 20,
	},
	section: {
		padding: theme.spacing(2),
		marginBottom: theme.spacing(2),
	},
	sectionTitle: {
		fontWeight: 600,
		marginBottom: theme.spacing(1.5),
	},
}));

const TagSchema = Yup.object().shape({
	name: Yup.string().min(3, "Mensagem muito curta").required("Obrigatório"),
});

function kb(path) {
	return i18n.t(`tagModal.form.kanbanColumn.${path}`);
}

function getRandomHexColor() {
	const red = Math.floor(Math.random() * 256);
	const greenCh = Math.floor(Math.random() * 256);
	const blue = Math.floor(Math.random() * 256);
	return `#${red.toString(16).padStart(2, "0")}${greenCh
		.toString(16)
		.padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`;
}

function computeRollbackLaneId({ rollbackToSelf, tagId, loadedRollback }) {
	const selfId = tagId != null ? Number(tagId) : null;
	const rawRb =
		loadedRollback != null && loadedRollback !== "" ? Number(loadedRollback) : NaN;
	const rb = !Number.isNaN(rawRb) && rawRb !== 0 ? rawRb : null;
	if (rollbackToSelf) {
		return selfId != null && !Number.isNaN(selfId) ? selfId : null;
	}
	if (selfId != null && rb != null && !Number.isNaN(rb) && rb !== selfId) {
		return rb;
	}
	return null;
}

const TagModal = ({ open, onClose, tagId, kanban, quadroGroupId }) => {
	const classes = useStyles();
	const { user } = useContext(AuthContext);
	const [colorPickerModalOpen, setColorPickerModalOpen] = useState(false);
	const [columnsSameBoard, setColumnsSameBoard] = useState([]);
	const [nextColumnId, setNextColumnId] = useState("");
	const [quadroGroups, setQuadroGroups] = useState([]);
	const [areaId, setAreaId] = useState("");
	const [rollbackToSelf, setRollbackToSelf] = useState(false);
	const [legacyRollbackOther, setLegacyRollbackOther] = useState(false);

	const initialState = {
		name: "",
		color: getRandomHexColor(),
		kanban: kanban,
		timeLane: 0,
		nextLaneId: 0,
		greetingMessageLane: "",
		rollbackLaneId: 0,
	};

	const [tag, setTag] = useState(initialState);

	useEffect(() => {
		if (!open || Number(kanban) !== 1) return;
		let cancelled = false;
		(async () => {
			try {
				const { data } = await api.get("/quadro-groups");
				const list = data.groups || data.lista || data || [];
				if (!cancelled) setQuadroGroups(Array.isArray(list) ? list : []);
			} catch (err) {
				if (!cancelled) setQuadroGroups([]);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [open, kanban]);

	useEffect(() => {
		if (!open || Number(kanban) !== 1 || tagId) return;
		if (quadroGroups.length === 0) return;
		setAreaId((prev) => {
			if (quadroGroupId != null && quadroGroupId !== "") {
				const s = String(quadroGroupId);
				if (quadroGroups.some((g) => String(g.id) === s)) return s;
			}
			if (prev && quadroGroups.some((g) => String(g.id) === prev)) return prev;
			return String(quadroGroups[0].id);
		});
	}, [open, kanban, tagId, quadroGroupId, quadroGroups]);

	useEffect(() => {
		if (!open || Number(kanban) !== 1 || !tagId) return;
		if (quadroGroupId != null && quadroGroupId !== "") {
			setAreaId(String(quadroGroupId));
		}
	}, [open, kanban, tagId, quadroGroupId]);

	useEffect(() => {
		const delayDebounceFn = setTimeout(() => {
			const fetchColumns = async () => {
				if (Number(kanban) !== 1) return;
				if (!areaId) {
					setColumnsSameBoard([]);
					return;
				}
				try {
					const { data } = await api.get("/tag/kanban/", {
						params: { quadroGroupId: areaId },
					});
					const list = data.lista || [];
					const arr = Array.isArray(list) ? list : [];
					const filtered =
						tagId != null
							? arr.filter((c) => String(c.id) !== String(tagId))
							: arr;
					setColumnsSameBoard(filtered);
				} catch (err) {
					toastError(err);
					setColumnsSameBoard([]);
				}
			};
			fetchColumns();
		}, 400);
		return () => clearTimeout(delayDebounceFn);
	}, [kanban, areaId, tagId]);

	useEffect(() => {
		if (!tagId || !open) return;
		let cancelled = false;
		(async () => {
			try {
				const { data } = await api.get(`/tags/${tagId}`);
				if (cancelled) return;
				setTag((prev) => ({ ...prev, ...data }));
				if (data.quadroGroupId != null && data.quadroGroupId !== "") {
					setAreaId(String(data.quadroGroupId));
				}
				if (data.nextLaneId) {
					setNextColumnId(Number(data.nextLaneId));
				} else {
					setNextColumnId("");
				}
				const rid =
					data.rollbackLaneId != null && data.rollbackLaneId !== ""
						? Number(data.rollbackLaneId)
						: null;
				const tid = Number(tagId);
				if (rid != null && !Number.isNaN(rid) && rid === tid) {
					setRollbackToSelf(true);
					setLegacyRollbackOther(false);
				} else if (rid != null && !Number.isNaN(rid) && rid !== tid) {
					setRollbackToSelf(false);
					setLegacyRollbackOther(true);
				} else {
					setRollbackToSelf(false);
					setLegacyRollbackOther(false);
				}
			} catch (err) {
				toastError(err);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [tagId, open]);

	const handleClose = () => {
		setTag(initialState);
		setColorPickerModalOpen(false);
		setAreaId("");
		setNextColumnId("");
		setColumnsSameBoard([]);
		setRollbackToSelf(false);
		setLegacyRollbackOther(false);
		onClose();
	};

	const handleAreaChange = (e) => {
		setAreaId(e.target.value);
		setNextColumnId("");
	};

	const handleSaveTag = async (values) => {
		if (Number(kanban) === 1 && (!areaId || areaId === "")) {
			toast.error("Selecione o quadro (Kanban) para esta coluna.");
			return;
		}

		const nextId =
			nextColumnId === "" || nextColumnId == null
				? null
				: Number(nextColumnId);

		const rollbackLaneId = computeRollbackLaneId({
			rollbackToSelf,
			tagId,
			loadedRollback: tag.rollbackLaneId,
		});

		const tagData = {
			...values,
			userId: user?.id,
			kanban: kanban,
			nextLaneId: nextId,
			rollbackLaneId,
		};
		if (Number(kanban) === 1) {
			tagData.quadroGroupId = Number(areaId);
		}

		try {
			if (tagId) {
				await api.put(`/tags/${tagId}`, tagData);
			} else {
				const createPayload = { ...tagData };
				if (rollbackToSelf) {
					createPayload.rollbackLaneId = null;
				}
				const { data: created } = await api.post("/tags", createPayload);
				if (rollbackToSelf && created?.id) {
					await api.put(`/tags/${created.id}`, {
						...tagData,
						rollbackLaneId: Number(created.id),
					});
				}
			}
			toast.success(
				kanban === 0
					? i18n.t("tagModal.success")
					: i18n.t("tagModal.successKanban")
			);
		} catch (err) {
			toastError(err);
		}
		handleClose();
	};

	const dialogTitle =
		Number(kanban) === 1
			? tagId
				? i18n.t("tagModal.title.editKanban")
				: i18n.t("tagModal.title.addKanban")
			: tagId
			? i18n.t("tagModal.title.edit")
			: i18n.t("tagModal.title.add");

	return (
		<div className={classes.root}>
			<Dialog
				open={open}
				onClose={handleClose}
				maxWidth={Number(kanban) === 1 ? "sm" : "md"}
				fullWidth
				scroll="paper"
			>
				<DialogTitle id="form-dialog-title">{dialogTitle}</DialogTitle>
				<Formik
					initialValues={tag}
					enableReinitialize={true}
					validationSchema={TagSchema}
					onSubmit={(values, actions) => {
						setTimeout(() => {
							handleSaveTag(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ touched, errors, isSubmitting, values }) => (
						<Form>
							<DialogContent dividers>
								{Number(kanban) === 1 ? (
									<>
										<Paper variant="outlined" className={classes.section}>
											<Typography
												variant="subtitle2"
												className={classes.sectionTitle}
												color="textPrimary"
											>
												{kb("sectionBasic")}
											</Typography>
											<Grid container spacing={2}>
												<Grid item xs={12}>
													<Field
														as={TextField}
														label={kb("nameLabel")}
														placeholder={kb("namePlaceholder")}
														name="name"
														error={touched.name && Boolean(errors.name)}
														helperText={touched.name && errors.name}
														variant="outlined"
														margin="dense"
														onChange={(e) =>
															setTag((prev) => ({
																...prev,
																name: e.target.value,
															}))
														}
														fullWidth
													/>
												</Grid>
												<Grid item xs={12}>
													<Field
														as={TextField}
														fullWidth
														label={kb("colorLabel")}
														name="color"
														id="color"
														error={touched.color && Boolean(errors.color)}
														helperText={touched.color && errors.color}
														InputProps={{
															startAdornment: (
																<InputAdornment position="start">
																	<div
																		style={{ backgroundColor: values.color }}
																		className={classes.colorAdorment}
																	/>
																</InputAdornment>
															),
															endAdornment: (
																<IconButton
																	size="small"
																	color="default"
																	onClick={() =>
																		setColorPickerModalOpen(!colorPickerModalOpen)
																	}
																>
																	<Colorize />
																</IconButton>
															),
														}}
														variant="outlined"
														margin="dense"
													/>
													{colorPickerModalOpen && (
														<Box mt={2}>
															<ColorBox
																disableAlpha={true}
																hslGradient={false}
																style={{ margin: "0 auto" }}
																value={tag.color}
																onChange={(val) => {
																	setTag((prev) => ({
																		...prev,
																		color: `#${val.hex}`,
																	}));
																}}
															/>
														</Box>
													)}
												</Grid>
											</Grid>
										</Paper>

										<Paper variant="outlined" className={classes.section}>
											<Typography
												variant="subtitle2"
												className={classes.sectionTitle}
												color="textPrimary"
											>
												{kb("sectionBoard")}
											</Typography>
											<FormControl variant="outlined" margin="dense" fullWidth required>
												<InputLabel id="tag-modal-quadro-label">
													{kb("boardLabel")} *
												</InputLabel>
												<Select
													labelId="tag-modal-quadro-label"
													label={`${kb("boardLabel")} *`}
													value={areaId}
													onChange={handleAreaChange}
													disabled={!quadroGroups.length}
												>
													{quadroGroups.map((g) => (
														<MenuItem key={g.id} value={String(g.id)}>
															{g.name}
														</MenuItem>
													))}
												</Select>
												<FormHelperText>{kb("boardHelper")}</FormHelperText>
											</FormControl>
										</Paper>

										<Paper variant="outlined" className={classes.section}>
											<Typography
												variant="subtitle2"
												className={classes.sectionTitle}
												color="textPrimary"
											>
												{kb("sectionAutomation")}
											</Typography>
											<Grid container spacing={2}>
												<Grid item xs={12} sm={6}>
													<Field
														as={TextField}
														label={kb("timeHoursLabel")}
														name="timeLane"
														type="number"
														inputProps={{ min: 0, step: 1 }}
														error={touched.timeLane && Boolean(errors.timeLane)}
														helperText={
															(touched.timeLane && errors.timeLane) ||
															kb("timeHoursHelper")
														}
														variant="outlined"
														margin="dense"
														onChange={(e) =>
															setTag((prev) => ({
																...prev,
																timeLane: e.target.value,
															}))
														}
														fullWidth
													/>
												</Grid>
												<Grid item xs={12} sm={6}>
													<FormControl variant="outlined" margin="dense" fullWidth>
														<InputLabel id="next-column-label">
															{kb("nextColumnLabel")}
														</InputLabel>
														<Select
															labelId="next-column-label"
															label={kb("nextColumnLabel")}
															value={nextColumnId === "" ? "" : nextColumnId}
															onChange={(e) =>
																setNextColumnId(
																	e.target.value === "" ? "" : Number(e.target.value)
																)
															}
														>
															<MenuItem value="">
																<em>{kb("nextColumnNone")}</em>
															</MenuItem>
															{columnsSameBoard.map((col) => (
																<MenuItem key={col.id} value={col.id}>
																	{col.name}
																</MenuItem>
															))}
														</Select>
														<FormHelperText>
															{!areaId ? kb("nextColumnBoardHint") : "\u00a0"}
														</FormHelperText>
													</FormControl>
												</Grid>
											</Grid>
										</Paper>

										<Paper variant="outlined" className={classes.section}>
											<Typography
												variant="subtitle2"
												className={classes.sectionTitle}
												color="textPrimary"
											>
												{kb("sectionMessage")}
											</Typography>
											<Field
												as={TextField}
												label={kb("greetingLabel")}
												name="greetingMessageLane"
												rows={3}
												multiline
												error={
													touched.greetingMessageLane &&
													Boolean(errors.greetingMessageLane)
												}
												helperText={
													(touched.greetingMessageLane &&
														errors.greetingMessageLane) ||
													kb("greetingHelper")
												}
												variant="outlined"
												margin="dense"
												onChange={(e) =>
													setTag((prev) => ({
														...prev,
														greetingMessageLane: e.target.value,
													}))
												}
												fullWidth
											/>
										</Paper>

										<Paper variant="outlined" className={classes.section}>
											<Typography
												variant="subtitle2"
												className={classes.sectionTitle}
												color="textPrimary"
											>
												{kb("sectionReopen")}
											</Typography>
											<FormControlLabel
												control={
													<Checkbox
														checked={rollbackToSelf}
														onChange={(e) => setRollbackToSelf(e.target.checked)}
														color="primary"
													/>
												}
												label={kb("rollbackCheckbox")}
											/>
											<Typography variant="body2" color="textSecondary" component="p">
												{kb("rollbackHelper")}
											</Typography>
											{legacyRollbackOther && (
												<Box mt={1}>
													<Typography variant="caption" color="textSecondary">
														{kb("legacyRollbackHint")}
													</Typography>
												</Box>
											)}
										</Paper>
									</>
								) : (
									<Grid container spacing={1}>
										<Grid item xs={12} md={12} xl={12}>
											<Field
												as={TextField}
												label={i18n.t("tagModal.form.name")}
												name="name"
												error={touched.name && Boolean(errors.name)}
												helperText={touched.name && errors.name}
												variant="outlined"
												margin="dense"
												onChange={(e) =>
													setTag((prev) => ({ ...prev, name: e.target.value }))
												}
												fullWidth
											/>
										</Grid>
										<Grid item xs={12} md={12} xl={12}>
											<Field
												as={TextField}
												fullWidth
												label={i18n.t("tagModal.form.color")}
												name="color"
												autoFocus
												id="color"
												error={touched.color && Boolean(errors.color)}
												helperText={touched.color && errors.color}
												InputProps={{
													startAdornment: (
														<InputAdornment position="start">
															<div
																style={{ backgroundColor: values.color }}
																className={classes.colorAdorment}
															/>
														</InputAdornment>
													),
													endAdornment: (
														<IconButton
															size="small"
															color="default"
															onClick={() =>
																setColorPickerModalOpen(!colorPickerModalOpen)
															}
														>
															<Colorize />
														</IconButton>
													),
												}}
												variant="outlined"
												margin="dense"
											/>
											{colorPickerModalOpen && (
												<div>
													<ColorBox
														disableAlpha={true}
														hslGradient={false}
														style={{ margin: "20px auto 0" }}
														value={tag.color}
														onChange={(val) => {
															setTag((prev) => ({
																...prev,
																color: `#${val.hex}`,
															}));
														}}
													/>
												</div>
											)}
										</Grid>
									</Grid>
								)}
							</DialogContent>
							<Divider />
							<DialogActions>
								<Button
									onClick={handleClose}
									color="secondary"
									disabled={isSubmitting}
									variant="outlined"
								>
									{i18n.t("tagModal.buttons.cancel")}
								</Button>
								<Button
									type="submit"
									color="primary"
									disabled={
										isSubmitting ||
										(Number(kanban) === 1 && (!areaId || !quadroGroups.length))
									}
									variant="contained"
									className={classes.btnWrapper}
								>
									{tagId
										? i18n.t("tagModal.buttons.okEdit")
										: i18n.t("tagModal.buttons.okAdd")}
									{isSubmitting && (
										<CircularProgress
											size={24}
											className={classes.buttonProgress}
										/>
									)}
								</Button>
							</DialogActions>
						</Form>
					)}
				</Formik>
			</Dialog>
		</div>
	);
};

export default TagModal;
