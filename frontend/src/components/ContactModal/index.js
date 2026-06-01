import React, { useState, useEffect, useRef } from "react";
import { parseISO, format } from "date-fns";
import * as Yup from "yup";
import { Formik, FieldArray, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import CircularProgress from "@material-ui/core/CircularProgress";
import Switch from "@material-ui/core/Switch";

import Alert from "@material-ui/lab/Alert";
import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { TagsContainer } from "../TagsContainer";
import { digitsOnly, formatPhoneBr, formatDocumentBr } from "../../utils/brazilContactFormat";
import { resolveContactWhatsAppPhone } from "../../utils/resolveContactWhatsAppPhone";

/** Normaliza para comparação (ex.: com/sem 55). */
function normalizePhoneDigitsForMatch(d) {
	let x = digitsOnly(d);
	if (x.startsWith("55") && x.length >= 12) {
		x = x.slice(2);
	}
	return x;
}

function samePhoneDigitsLoose(a, b) {
	if (!a || !b) return false;
	if (a === b) return true;
	if (a.length < 8 || b.length < 8) return false;
	return a.endsWith(b) || b.endsWith(a);
}

/** Ao sair do número: tenta encontrar contato existente e preencher nome/e-mail. */
async function fetchContactMatchByNumber(digitsRaw, setFieldValue, currentName) {
	const want = normalizePhoneDigitsForMatch(digitsRaw);
	if (want.length < 8) return;
	const digits = digitsOnly(digitsRaw);
	try {
		const { data } = await api.get("/contacts/", {
			params: { searchParam: digits, pageNumber: 1 },
		});
		const list = data.contacts || [];
		const exact =
			list.find(
				(c) => normalizePhoneDigitsForMatch(c.number) === want
			) ||
			list.find((c) =>
				samePhoneDigitsLoose(
					normalizePhoneDigitsForMatch(c.number),
					want
				)
			);
		if (!exact) return;
		const nm = (currentName || "").trim();
		if (!nm || nm.length < 2) {
			setFieldValue("name", exact.name || "");
		}
		if (exact.email) {
			setFieldValue("email", exact.email);
		}
	} catch (_) {
		/* silencioso */
	}
}
// import AsyncSelect from "../AsyncSelect";

const useStyles = makeStyles(theme => ({
	root: {
		display: "flex",
		flexWrap: "wrap",
	},
	textField: {
		marginRight: theme.spacing(1),
		flex: 1,
	},

	extraAttr: {
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
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
}));

const contactSchema = () =>
	Yup.object().shape({
		name: Yup.string()
			.min(2, "Too Short!")
			.max(250, "Too Long!")
			.required("Required"),
		number: Yup.string().min(8, "Too Short!").max(50, "Too Long!"),
		email: Yup.string().email("Invalid email"),
		document: Yup.string()
			.nullable()
			.test(
				"doc-len",
				i18n.t("contactModal.form.documentInvalid"),
				(val) => {
					const d = digitsOnly(val || "");
					return d.length === 0 || d.length === 11 || d.length === 14;
				}
			),
	});

const ContactModal = ({ open, onClose, contactId, initialValues, onSave }) => {
	const classes = useStyles();
	const isMounted = useRef(true);

	const initialState = {
		name: "",
		number: "",
		email: "",
		document: "",
		disableBot: false,
		lgpdAcceptedAt: ""
	};

	const [contact, setContact] = useState(initialState);
	const [isLidContact, setIsLidContact] = useState(false);
	const [disableBot, setDisableBot] = useState(false);
	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	useEffect(() => {
		const fetchContact = async () => {
			if (initialValues) {
				setContact(prevState => {
					return { ...prevState, ...initialValues };
				});
			}

			if (!contactId) return;

			try {
				const { data } = await api.get(`/contacts/${contactId}`);
				if (isMounted.current) {
					// Se número for LID (ID interno WhatsApp, não telefone real), limpa o campo
					// para o usuário preencher o telefone correto.
					const resolved = resolveContactWhatsAppPhone(data);
					const numberForForm = resolved.isInternalId ? "" : (resolved.copyText || data.number || "");
					setIsLidContact(resolved.isInternalId);
					setContact({ ...data, number: numberForForm });
					setDisableBot(data.disableBot)
				}
			} catch (err) {
				toastError(err);
			}
		};

		fetchContact();
	}, [contactId, open, initialValues]);

	const handleClose = () => {
		onClose();
		setContact(initialState);
		setIsLidContact(false);
	};

	const handleSaveContact = async values => {
		const num = digitsOnly(values.number || "");
		const doc = digitsOnly(values.document || "");
		const payload = {
			...values,
			number: num,
			document: doc.length ? doc : null,
			disableBot: disableBot
		};
		try {
			if (contactId) {
				await api.put(`/contacts/${contactId}`, payload);
				handleClose();
			} else {
				const { data } = await api.post("/contacts", payload);
				if (onSave) {
					onSave(data);
				}
				handleClose();
			}
			toast.success(i18n.t("contactModal.success"));
		} catch (err) {
			toastError(err);
		}
	};

	return (
		<div className={classes.root}>
			<Dialog open={open} onClose={handleClose} maxWidth="lg" scroll="paper">
				<DialogTitle id="form-dialog-title">
					{contactId
						? `${i18n.t("contactModal.title.edit")}`
						: `${i18n.t("contactModal.title.add")}`}
				</DialogTitle>
				<Formik
					initialValues={contact}
					enableReinitialize={true}
					validationSchema={contactSchema()}
					onSubmit={(values, actions) => {
						setTimeout(() => {
							handleSaveContact(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ values, errors, touched, isSubmitting, setFieldValue }) => (
						<Form>
							<DialogContent dividers>
								<Typography variant="subtitle1" gutterBottom>
									{i18n.t("contactModal.form.mainInfo")}
								</Typography>
								<Box display="flex" flexDirection="column" style={{ gap: 10 }}>
								<Field
									as={TextField}
									label={i18n.t("contactModal.form.name")}
									name="name"
									autoFocus
									error={touched.name && Boolean(errors.name)}
									helperText={touched.name && errors.name}
									variant="outlined"
									margin="dense"
									fullWidth
								/>
								<Field
									as={TextField}
									label={i18n.t("contactModal.form.email")}
									name="email"
									error={touched.email && Boolean(errors.email)}
									helperText={touched.email && errors.email}
									placeholder={i18n.t("contactModal.form.emailPlaceholder")}
									fullWidth
									margin="dense"
									variant="outlined"
								/>
								{isLidContact && (
									<Alert severity="warning" style={{ marginBottom: 4 }}>
										Este contato usa ID interno do WhatsApp e não possui número de telefone cadastrado.
										Preencha o número abaixo para habilitar envio de mensagens.
									</Alert>
								)}
								<Field name="number">
									{({ field, form }) => (
										<TextField
											name={field.name}
											label={i18n.t("contactModal.form.phone")}
											error={touched.number && Boolean(errors.number)}
											helperText={
												(touched.number && errors.number) ||
												i18n.t("contactModal.form.numberLookupHint")
											}
											placeholder={i18n.t("contactModal.form.phonePlaceholder")}
											variant="outlined"
											margin="dense"
											fullWidth
											value={formatPhoneBr(field.value)}
											onChange={(e) =>
												form.setFieldValue(field.name, digitsOnly(e.target.value).slice(0, 13))
											}
											onBlur={(e) => {
												field.onBlur(e);
												if (!contactId) {
													fetchContactMatchByNumber(
														e.target.value,
														form.setFieldValue,
														form.values.name
													);
												}
											}}
										/>
									)}
								</Field>
								<Field name="document">
									{({ field, form }) => (
										<TextField
											label={i18n.t("contactModal.form.document")}
											error={touched.document && Boolean(errors.document)}
											helperText={
												(touched.document && errors.document) ||
												i18n.t("contactModal.form.documentHint")
											}
											placeholder={i18n.t("contactModal.form.documentPlaceholder")}
											variant="outlined"
											margin="dense"
											fullWidth
											value={formatDocumentBr(field.value)}
											onChange={(e) =>
												form.setFieldValue(field.name, digitsOnly(e.target.value).slice(0, 14))
											}
											onBlur={field.onBlur}
											name={field.name}
										/>
									)}
								</Field>
								</Box>
								<div>
									<TagsContainer contact={contact} className={classes.textField} />
								</div>
								<Typography
									style={{ marginBottom: 8, marginTop: 12 }}
									variant="subtitle1"
								>
									<Switch
										size="small"
										checked={disableBot}
										onChange={() =>
											setDisableBot(!disableBot)
										}
										name="disableBot"
									/>
									{i18n.t("contactModal.form.chatBotContact")}
								</Typography>
								<Typography
									style={{ marginBottom: 8, marginTop: 12 }}
									variant="subtitle1"
								>
									{i18n.t("contactModal.form.whatsapp")} {contact?.whatsapp ? contact?.whatsapp.name : ""}
								</Typography>
								<Typography
									style={{ marginBottom: 8, marginTop: 12 }}
									variant="subtitle1"
								>
									{i18n.t("contactModal.form.termsLGDP")} {contact?.lgpdAcceptedAt ? format(new Date(contact?.lgpdAcceptedAt), "dd/MM/yyyy 'às' HH:mm") : ""}
								</Typography>

								{/* <Typography variant="subtitle1" gutterBottom>{i18n.t("contactModal.form.customer_portfolio")}</Typography> */}
								{/* <div style={{ marginTop: 10 }}>
									<AsyncSelect url="/users" dictKey={"users"}
										initialValue={values.user} width="100%" label={i18n.t("contactModal.form.attendant")}
										onChange={(event, value) => setFieldValue("userId", value ? value.id : null)} />
								</div>
								<div style={{ marginTop: 10 }}>
									<AsyncSelect url="/queue" dictKey={null}
										initialValue={values.queue} width="100%" label={i18n.t("contactModal.form.queue")}
										onChange={(event, value) => setFieldValue("queueId", value ? value.id : null)} />
								</div> */}
								<Typography
									style={{ marginBottom: 8, marginTop: 12 }}
									variant="subtitle1"
								>
									{i18n.t("contactModal.form.extraInfo")}
								</Typography>

								<FieldArray name="extraInfo">
									{({ push, remove }) => (
										<>
											{values.extraInfo &&
												values.extraInfo.length > 0 &&
												values.extraInfo.map((info, index) => (
													<div
														className={classes.extraAttr}
														key={`${index}-info`}
													>
														<Field
															as={TextField}
															label={i18n.t("contactModal.form.extraName")}
															name={`extraInfo[${index}].name`}
															variant="outlined"
															margin="dense"
															className={classes.textField}
														/>
														<Field
															as={TextField}
															label={i18n.t("contactModal.form.extraValue")}
															name={`extraInfo[${index}].value`}
															variant="outlined"
															margin="dense"
															className={classes.textField}
														/>
														<IconButton
															size="small"
															onClick={() => remove(index)}
														>
															<DeleteOutlineIcon />
														</IconButton>
													</div>
												))}
											<div className={classes.extraAttr}>
												<Button
													style={{ flex: 1, marginTop: 8 }}
													variant="outlined"
													color="primary"
													onClick={() => push({ name: "", value: "" })}
												>
													{`+ ${i18n.t("contactModal.buttons.addExtraInfo")}`}
												</Button>
											</div>
										</>
									)}
								</FieldArray>
							</DialogContent>
							<DialogActions>
								<Button
									onClick={handleClose}
									color="secondary"
									disabled={isSubmitting}
									variant="outlined"
								>
									{i18n.t("contactModal.buttons.cancel")}
								</Button>
								<Button
									type="submit"
									color="primary"
									disabled={isSubmitting}
									variant="contained"
									className={classes.btnWrapper}
								>
									{contactId
										? `${i18n.t("contactModal.buttons.okEdit")}`
										: `${i18n.t("contactModal.buttons.okAdd")}`}
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

export default ContactModal;
