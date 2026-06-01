import React, { useEffect, useRef, useState } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@material-ui/core";

import { makeStyles, alpha } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";

import AddPhotoAlternateOutlinedIcon from "@material-ui/icons/AddPhotoAlternateOutlined";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import VisibilityIcon from "@material-ui/icons/Visibility";
import VisibilityOffIcon from "@material-ui/icons/VisibilityOff";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import usePlans from "../../hooks/usePlans";

const useStyles = makeStyles((theme) => ({
  content: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    padding: theme.spacing(2.5),
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
  },
  sectionTitle: {
    fontWeight: 600,
    fontSize: "0.82rem",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    color: theme.palette.text.secondary,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: theme.spacing(1.5),
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr",
    },
  },
  fullRow: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: theme.spacing(1.5),
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
    padding: theme.spacing(1.5),
    borderRadius: theme.spacing(1),
    border: `1px dashed ${theme.palette.divider}`,
    backgroundColor:
      theme.palette.type === "dark"
        ? alpha(theme.palette.common.white, 0.03)
        : alpha(theme.palette.common.black, 0.02),
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 12,
    fontSize: "1.1rem",
    fontWeight: 600,
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    color: theme.palette.primary.main,
  },
  logoActions: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  hiddenInput: {
    display: "none",
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
  statusRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1),
    paddingTop: theme.spacing(0.5),
  },
}));

const CompanySchema = Yup.object().shape({
  name: Yup.string()
    .min(2, i18n.t("companyModal.validation.nameTooShort"))
    .max(80, i18n.t("companyModal.validation.nameTooLong"))
    .required(i18n.t("companyModal.validation.nameRequired")),
  email: Yup.string()
    .email(i18n.t("companyModal.validation.emailInvalid"))
    .required(i18n.t("companyModal.validation.emailRequired")),
  document: Yup.string().max(32).nullable(),
  phone: Yup.string().max(32).nullable(),
  address: Yup.string().max(255).nullable(),
  passwordDefault: Yup.string().when("$isCreating", {
    is: true,
    then: Yup.string().min(5, i18n.t("companyModal.validation.passwordTooShort")),
    otherwise: Yup.string().notRequired(),
  }),
});

const initialState = {
  name: "",
  email: "",
  phone: "",
  document: "",
  address: "",
  passwordDefault: "",
  planId: "",
  status: true,
  logo: "",
  logoUrl: null,
};

/** Garante objeto plano vindo do GET (evita resposta aninhada ou campos undefined). */
function normalizeApiCompanyPayload(body) {
  const data =
    body &&
    typeof body === "object" &&
    body.data &&
    typeof body.data === "object" &&
    !Array.isArray(body.data)
      ? body.data
      : body;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  const rawPlanId = data.planId ?? data.plan?.id;
  const planIdStr =
    rawPlanId != null && rawPlanId !== "" ? String(rawPlanId) : "";
  return {
    ...initialState,
    ...data,
    passwordDefault: "",
    planId: planIdStr,
    status: data.status !== false,
    address: data.address != null ? String(data.address) : "",
    phone: data.phone != null ? String(data.phone) : "",
    document: data.document != null ? String(data.document) : "",
    name: data.name != null ? String(data.name) : "",
    email: data.email != null ? String(data.email) : "",
    logo: data.logo != null ? String(data.logo) : "",
    logoUrl: data.logoUrl || null,
  };
}

const CompanyModal = ({ open, onClose, companyId, onSaved }) => {
  const classes = useStyles();
  const fileInputRef = useRef(null);

  const [company, setCompany] = useState(initialState);
  /** Só monta o Formik depois dos dados no modo edição, para não ficar preso em valores vazios. */
  const [formReady, setFormReady] = useState(() => !companyId);
  const [plans, setPlans] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const { list: listPlans } = usePlans();

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const list = await listPlans();
        if (alive) setPlans(Array.isArray(list) ? list : []);
      } catch (err) {
        /* silencioso */
      }
    };
    if (open) {
      load();
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!companyId) {
      setCompany(initialState);
      setFormReady(true);
      return;
    }
    setFormReady(false);
    let alive = true;
    (async () => {
      try {
        const [planList, res] = await Promise.all([
          listPlans(),
          api.get(`/companies/listPlan/${companyId}`),
        ]);
        if (!alive) return;
        setPlans(Array.isArray(planList) ? planList : []);
        const next = normalizeApiCompanyPayload(res?.data);
        if (next) setCompany(next);
      } catch (err) {
        toastError(err);
      } finally {
        if (alive) setFormReady(true);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, open]);

  const handleClose = () => {
    setCompany(initialState);
    setShowPassword(false);
    setLogoUploading(false);
    onClose && onClose();
  };

  const handleSubmit = async (values) => {
    const payload = { ...values };
    if (payload.planId !== "" && payload.planId != null) {
      const n = parseInt(String(payload.planId), 10);
      payload.planId = Number.isFinite(n) ? n : null;
    } else {
      payload.planId = null;
    }
    if (!payload.passwordDefault) {
      delete payload.passwordDefault;
    } else {
      payload.password = payload.passwordDefault;
      delete payload.passwordDefault;
    }
    delete payload.logoUrl;

    try {
      let saved;
      if (companyId) {
        const { data } = await api.put(`/companies/${companyId}`, payload);
        saved = data;
      } else {
        const { data } = await api.post("/companies", payload);
        saved = data;
      }
      toast.success(i18n.t("companyModal.success"));
      onSaved && onSaved(saved);
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  const handleLogoPick = () => {
    if (!companyId) {
      toast.info(i18n.t("companyModal.logo.saveFirst"));
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !companyId) return;
    const form = new FormData();
    form.append("file", file);
    setLogoUploading(true);
    try {
      const { data } = await api.post(
        `/companies/${companyId}/logo`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setCompany((prev) => ({
        ...prev,
        logo: data?.logo || "",
        logoUrl: data?.logoUrl || null,
      }));
      toast.success(i18n.t("companyModal.logo.uploaded"));
    } catch (err) {
      toastError(err);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoRemove = async () => {
    if (!companyId) return;
    setLogoUploading(true);
    try {
      const { data } = await api.delete(`/companies/${companyId}/logo`);
      setCompany((prev) => ({
        ...prev,
        logo: data?.logo || "",
        logoUrl: data?.logoUrl || null,
      }));
    } catch (err) {
      toastError(err);
    } finally {
      setLogoUploading(false);
    }
  };

  const getInitials = (name) => {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
    >
      <DialogTitle>
        {companyId
          ? i18n.t("companyModal.title.edit")
          : i18n.t("companyModal.title.add")}
      </DialogTitle>

      {companyId && !formReady ? (
        <DialogContent className={classes.content}>
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        </DialogContent>
      ) : (
      <Formik
        key={companyId ? `edit-${companyId}` : "create"}
        enableReinitialize
        initialValues={company}
        validationSchema={CompanySchema}
        validateOnBlur
        validateOnChange={false}
        onSubmit={async (values, actions) => {
          await handleSubmit(values);
          actions.setSubmitting(false);
        }}
      >
        {({ values, touched, errors, isSubmitting, setFieldValue }) => (
          <Form>
            <DialogContent dividers className={classes.content}>
              <Box className={classes.section}>
                <Typography className={classes.sectionTitle}>
                  {i18n.t("companyModal.sections.basic")}
                </Typography>
                <Box className={classes.fullRow}>
                  <Field name="name">
                    {({ field }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        autoFocus
                        label={i18n.t("companyModal.form.name")}
                        variant="outlined"
                        size="small"
                        fullWidth
                        error={touched.name && Boolean(errors.name)}
                        helperText={touched.name && errors.name}
                      />
                    )}
                  </Field>
                </Box>
                <Box className={classes.row}>
                  <Field name="document">
                    {({ field }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        label={i18n.t("companyModal.form.document")}
                        variant="outlined"
                        size="small"
                        fullWidth
                      />
                    )}
                  </Field>
                  <FormControl variant="outlined" size="small" fullWidth>
                    <InputLabel id="company-plan-label">
                      {i18n.t("companyModal.form.plan")}
                    </InputLabel>
                    <Field name="planId">
                      {({ field, form }) => (
                        <Select
                          variant="outlined"
                          fullWidth
                          labelId="company-plan-label"
                          label={i18n.t("companyModal.form.plan")}
                          name={field.name}
                          value={
                            field.value === undefined ||
                            field.value === null ||
                            field.value === ""
                              ? ""
                              : String(field.value)
                          }
                          onChange={(e) =>
                            form.setFieldValue(field.name, e.target.value)
                          }
                          onBlur={field.onBlur}
                        >
                          <MenuItem value="">
                            <em>{i18n.t("companyModal.form.noPlan")}</em>
                          </MenuItem>
                          {plans.map((plan) => (
                            <MenuItem key={plan.id} value={String(plan.id)}>
                              {plan.name}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    </Field>
                  </FormControl>
                </Box>
                <Box className={classes.statusRow}>
                  <Typography variant="body2" color="textSecondary">
                    {i18n.t("companyModal.form.statusLabel")}
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(values.status)}
                        onChange={(e) =>
                          setFieldValue("status", e.target.checked)
                        }
                        color="primary"
                      />
                    }
                    label={
                      values.status
                        ? i18n.t("compaies.statusActive")
                        : i18n.t("compaies.statusInactive")
                    }
                  />
                </Box>
              </Box>

              <Divider />

              <Box className={classes.section}>
                <Typography className={classes.sectionTitle}>
                  {i18n.t("companyModal.sections.contact")}
                </Typography>
                <Box className={classes.row}>
                  <Field name="email">
                    {({ field }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        label={i18n.t("companyModal.form.email")}
                        variant="outlined"
                        size="small"
                        fullWidth
                        error={touched.email && Boolean(errors.email)}
                        helperText={touched.email && errors.email}
                      />
                    )}
                  </Field>
                  <Field name="phone">
                    {({ field }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        label={i18n.t("companyModal.form.phone")}
                        variant="outlined"
                        size="small"
                        fullWidth
                      />
                    )}
                  </Field>
                </Box>
                <Box className={classes.fullRow}>
                  <Field name="address">
                    {({ field }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        label={i18n.t("companyModal.form.address")}
                        variant="outlined"
                        size="small"
                        fullWidth
                        multiline
                        minRows={2}
                      />
                    )}
                  </Field>
                </Box>
              </Box>

              <Divider />

              <Box className={classes.section}>
                <Typography className={classes.sectionTitle}>
                  {i18n.t("companyModal.sections.access")}
                </Typography>
                <Box className={classes.fullRow}>
                  <Field name="passwordDefault">
                    {({ field }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        label={
                          companyId
                            ? i18n.t("companyModal.form.passwordChangeOptional")
                            : i18n.t("companyModal.form.passwordDefault")
                        }
                        type={showPassword ? "text" : "password"}
                        variant="outlined"
                        size="small"
                        fullWidth
                        error={
                          touched.passwordDefault &&
                          Boolean(errors.passwordDefault)
                        }
                        helperText={
                          touched.passwordDefault && errors.passwordDefault
                        }
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => setShowPassword((v) => !v)}
                              >
                                {showPassword ? (
                                  <VisibilityOffIcon fontSize="small" />
                                ) : (
                                  <VisibilityIcon fontSize="small" />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  </Field>
                </Box>
              </Box>

              <Divider />

              <Box className={classes.section}>
                <Typography className={classes.sectionTitle}>
                  {i18n.t("companyModal.sections.brand")}
                </Typography>
                <Box className={classes.logoWrap}>
                  <Avatar
                    className={classes.logo}
                    src={company.logoUrl || undefined}
                    variant="rounded"
                  >
                    {company.logoUrl ? null : getInitials(values.name)}
                  </Avatar>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2">
                      {i18n.t("companyModal.logo.title")}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {i18n.t("companyModal.logo.hint")}
                    </Typography>
                  </Box>
                  <Box className={classes.logoActions}>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleLogoChange}
                      className={classes.hiddenInput}
                    />
                    <Tooltip
                      title={
                        companyId
                          ? i18n.t("companyModal.logo.upload")
                          : i18n.t("companyModal.logo.saveFirst")
                      }
                    >
                      <span>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AddPhotoAlternateOutlinedIcon />}
                          onClick={handleLogoPick}
                          disabled={logoUploading}
                        >
                          {i18n.t("companyModal.logo.upload")}
                        </Button>
                      </span>
                    </Tooltip>
                    {company.logo && (
                      <Tooltip title={i18n.t("companyModal.logo.remove")}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={handleLogoRemove}
                            disabled={logoUploading}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </Box>
            </DialogContent>

            <DialogActions>
              <Button
                onClick={handleClose}
                color="default"
                disabled={isSubmitting}
              >
                {i18n.t("companyModal.buttons.cancel")}
              </Button>
              <div className={classes.btnWrapper}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting}
                >
                  {companyId
                    ? i18n.t("companyModal.buttons.okEdit")
                    : i18n.t("companyModal.buttons.okAdd")}
                </Button>
                {isSubmitting && (
                  <CircularProgress
                    size={24}
                    className={classes.buttonProgress}
                  />
                )}
              </div>
            </DialogActions>
          </Form>
        )}
      </Formik>
      )}
    </Dialog>
  );
};

export default CompanyModal;
