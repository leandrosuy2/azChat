import React, { useState, useEffect, useRef } from "react";

import * as Yup from "yup";
import { Formik, FieldArray, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import CircularProgress from "@material-ui/core/CircularProgress";
import Checkbox from "@material-ui/core/Checkbox";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Box from "@material-ui/core/Box";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";

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

const ContactSchema = Yup.object().shape({
	name: Yup.string()
		.min(2, "Muito curto!")
		.max(50, "Muito longo!")
		.required("Digite um nome!"),
});

const FlowBuilderModal = ({ open, onClose, flowId, nameWebhook = "", initialValues, onSave }) => {
	const classes = useStyles();
	const isMounted = useRef(true);

	const [contact, setContact] = useState({
		name: nameWebhook,
		channels: initialValues?.channels || ["whatsapp", "facebook", "instagram"],
	});

	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	useEffect(() => {
		if (!open) return;
		setContact({
			name: nameWebhook || "",
			channels: initialValues?.channels || ["whatsapp", "facebook", "instagram"],
		});
	}, [open, nameWebhook, initialValues]);

	const handleClose = () => {
		onClose();
		setContact({
			name: "",
			channels: ["whatsapp", "facebook", "instagram"],
		});
	};

	const handleSaveContact = async values => {
		if(flowId){
			try {
				await api.put("/flowbuilder", {
					name: values.name,
					flowId,
					channels: values.channels?.length ? values.channels : ["whatsapp", "facebook", "instagram"]
				  });
				  onSave(values.name)
				  handleClose()
				toast.success(i18n.t("webhookModal.toasts.update"));
			} catch (err) {
				toastError(err);
			}
		} else {
		try {
			await api.post("/flowbuilder", {
				name: values.name,
				channels: values.channels?.length ? values.channels : ["whatsapp", "facebook", "instagram"]
			  });
			  onSave(values.name)
			  handleClose()
			toast.success(i18n.t("webhookModal.saveSuccess"));
		} catch (err) {
			toastError(err);
		}
	}
	};
	
	return (
		<div className={classes.root}>
			<Dialog open={open} onClose={handleClose} fullWidth="md" scroll="paper">
				<DialogTitle id="form-dialog-title">
					{flowId
						? `Editar Fluxo`
						: `Adicionar Fluxo`}
				</DialogTitle>
				<Formik
					initialValues={contact}
					enableReinitialize={true}
					validationSchema={ContactSchema}
					onSubmit={(values, actions) => {
						setTimeout(() => {
							handleSaveContact(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ values, errors, touched, isSubmitting, setFieldValue }) => {
						const toggleChannel = (channel) => {
							const current = Array.isArray(values.channels) ? values.channels : [];
							const next = current.includes(channel)
								? current.filter((item) => item !== channel)
								: [...current, channel];
							setFieldValue("channels", next);
						};

						return (
						<Form>
							<DialogContent dividers>
								<Field
									as={TextField}
									label={i18n.t("contactModal.form.name")}
									name="name"
									autoFocus
									defaultValue={contact.name}
									error={Boolean(errors.name)}
									helperText={errors.name}
									variant="outlined"
									margin="dense"
									className={classes.textField}
									style={{width: '95%'}}
								/>
								<Box mt={2}>
									<Typography variant="subtitle2">Canais permitidos</Typography>
									{[
										["whatsapp", "WhatsApp"],
										["facebook", "Facebook"],
										["instagram", "Instagram"],
									].map(([channel, label]) => (
										<FormControlLabel
											key={channel}
											control={
												<Checkbox
													color="primary"
													checked={(values.channels || []).includes(channel)}
													onChange={() => toggleChannel(channel)}
												/>
											}
											label={label}
										/>
									))}
								</Box>
							
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
									{flowId
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
					);
					}}
				</Formik>
			</Dialog>
		</div>
	);
};

export default FlowBuilderModal;
