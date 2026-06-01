import React, { useState, useEffect } from "react";
import {
    makeStyles,
    Paper,
    Grid,
    TextField,
    Table,
    TableHead,
    TableBody,
    TableCell,
    TableRow,
    IconButton,
    MenuItem,
    Typography,
    Chip,
    Link
} from "@material-ui/core";
import { Formik, Form, Field } from 'formik';
import ButtonWithSpinner from "../ButtonWithSpinner";
import ConfirmationModal from "../ConfirmationModal";

import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    AttachFile as AttachFileIcon
} from "@material-ui/icons";

import { toast } from "react-toastify";
import useHelps from "../../hooks/useHelps";
import { i18n } from "../../translate/i18n";


const useStyles = makeStyles(theme => ({
	root: {
		width: '100%'
	},
    mainPaper: {
		width: '100%',
		flex: 1,
		padding: theme.spacing(2)
    },
	fullWidth: {
		width: '100%'
	},
    sectionPaper: {
        padding: theme.spacing(2),
        width: "100%",
        backgroundColor: theme.mode === "light" ? "#fafafa" : "rgba(255,255,255,0.04)"
    },
    sectionTitle: {
        fontWeight: 600,
        marginBottom: theme.spacing(1)
    },
    tableContainer: {
		width: '100%',
		overflowX: "scroll",
		...theme.scrollbarStyles
    },
	textfield: {
		width: '100%'
	},
    textRight: {
        textAlign: 'right'
    },
    row: {
		paddingTop: theme.spacing(2),
		paddingBottom: theme.spacing(2)
    },
    control: {
		paddingRight: theme.spacing(1),
		paddingLeft: theme.spacing(1)
	},
    buttonContainer: {
        textAlign: 'right',
		padding: theme.spacing(1)
	}
}));

const backendUrl = process.env.REACT_APP_BACKEND_URL;
const TUTORIAL_TYPES = {
    video: "video",
    markdown: "markdown",
    pdf: "pdf"
}

const inferTutorialType = (record = {}) => {
    if ((record.attachments || []).some((att) => att.mimetype === "application/pdf" || att.type === "pdf")) {
        return TUTORIAL_TYPES.pdf
    }

    if (record.video) {
        return TUTORIAL_TYPES.video
    }

    return TUTORIAL_TYPES.markdown
}

const getAreaLabel = (areaKey, fallback) => {
    if (!areaKey) return fallback || "";
    const translationKey = `helps.areaLabels.${areaKey}`;
    const translated = i18n.t(translationKey);

    return translated === translationKey ? fallback || areaKey : translated;
}

export function HelpManagerForm (props) {
    const {
        onSubmit, onDelete, onCancel, initialValue, loading,
        areas, onUploadAttachment, onRemoveAttachment, uploading
    } = props;
    const classes = useStyles()

    const [record, setRecord] = useState(initialValue);
    const [pendingPdfFile, setPendingPdfFile] = useState(null);

    useEffect(() => {
        setRecord(initialValue)
        setPendingPdfFile(null)
    }, [initialValue])

    const handleSubmit = async(data) => {
        onSubmit(data, pendingPdfFile)
    }

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (record.id === undefined) {
                setPendingPdfFile(file);
            } else {
                onUploadAttachment(file);
            }
        }
        e.target.value = "";
    }

    return (
        <Formik
            enableReinitialize
            className={classes.fullWidth}
            initialValues={record}
            onSubmit={(values, { resetForm }) =>
                setTimeout(() => {
                    handleSubmit(values)
                    resetForm()
                }, 500)
            }
        >
            {({ values, setFieldValue }) => (
                <Form className={classes.fullWidth}>
                    <Grid spacing={2} justifyContent="flex-end" container>
                        <Grid xs={12} sm={6} md={3} item>
                            <Field
                                as={TextField}
                                label="Título"
                                name="title"
                                variant="outlined"
                                className={classes.fullWidth}
                                margin="dense"
                            />
                        </Grid>
                        <Grid xs={12} sm={6} md={3} item>
                            <Field
                                as={TextField}
                                select
                                label="Tipo de tutorial"
                                name="tutorialType"
                                variant="outlined"
                                className={classes.fullWidth}
                                margin="dense"
                                onChange={(event) => {
                                    const nextType = event.target.value;
                                    setFieldValue("tutorialType", nextType);
                                    if (nextType !== TUTORIAL_TYPES.video) {
                                        setFieldValue("video", "");
                                    }
                                    if (nextType === TUTORIAL_TYPES.pdf) {
                                        setFieldValue("content", "");
                                    }
                                }}
                                helperText={
                                    values.tutorialType === TUTORIAL_TYPES.video
                                        ? "Vídeo com texto complementar."
                                        : values.tutorialType === TUTORIAL_TYPES.markdown
                                            ? "Texto formatado em Markdown."
                                            : "Arquivo PDF anexado ao tutorial."
                                }
                            >
                                <MenuItem value={TUTORIAL_TYPES.video}>Vídeo + conteúdo</MenuItem>
                                <MenuItem value={TUTORIAL_TYPES.markdown}>Markdown</MenuItem>
                                <MenuItem value={TUTORIAL_TYPES.pdf}>PDF</MenuItem>
                            </Field>
                        </Grid>
                        <Grid xs={12} sm={6} md={3} item>
                            <Field
                                as={TextField}
                                select
                                label="Área vinculada"
                                name="areaKey"
                                variant="outlined"
                                className={classes.fullWidth}
                                margin="dense"
                            >
                                <MenuItem value="">
                                    <em>Nenhuma</em>
                                </MenuItem>
                                {areas.map((a) => (
                                    <MenuItem key={a.key} value={a.key}>
                                        {getAreaLabel(a.key, a.label)}
                                    </MenuItem>
                                ))}
                            </Field>
                        </Grid>
                        <Grid xs={12} sm={6} md={3} item>
                            <Field
                                as={TextField}
                                label={i18n.t("helps.settings.description")}
                                name="description"
                                variant="outlined"
                                className={classes.fullWidth}
                                margin="dense"
                            />
                        </Grid>
                        <Grid xs={12} item>
                            <Paper className={classes.sectionPaper} variant="outlined">
                                <Typography className={classes.sectionTitle} variant="subtitle2">
                                    {values.tutorialType === TUTORIAL_TYPES.video && "Tutorial em vídeo"}
                                    {values.tutorialType === TUTORIAL_TYPES.markdown && "Tutorial em Markdown"}
                                    {values.tutorialType === TUTORIAL_TYPES.pdf && "Tutorial em PDF"}
                                </Typography>
                                {values.tutorialType === TUTORIAL_TYPES.video && (
                                    <Grid spacing={2} container>
                                        <Grid xs={12} md={6} item>
                                            <Field
                                                as={TextField}
                                                label="URL do vídeo"
                                                name="video"
                                                variant="outlined"
                                                className={classes.fullWidth}
                                                margin="dense"
                                                helperText="Use YouTube watch, youtu.be, embed ou apenas o ID do vídeo."
                                            />
                                        </Grid>
                                        <Grid xs={12} item>
                                            <Field
                                                as={TextField}
                                                label="Conteúdo complementar"
                                                name="content"
                                                variant="outlined"
                                                className={classes.fullWidth}
                                                margin="dense"
                                                multiline
                                                minRows={6}
                                                helperText="Opcional. Use para roteiro, passos, links e observações abaixo do vídeo."
                                            />
                                        </Grid>
                                    </Grid>
                                )}
                                {values.tutorialType === TUTORIAL_TYPES.markdown && (
                                    <Field
                                        as={TextField}
                                        label="Conteúdo em Markdown"
                                        name="content"
                                        variant="outlined"
                                        className={classes.fullWidth}
                                        margin="dense"
                                        multiline
                                        minRows={10}
                                        helperText="Aceita títulos, listas, tabelas, links e blocos de texto em Markdown."
                                    />
                                )}
                                {values.tutorialType === TUTORIAL_TYPES.pdf && (
                                    <>
                                        <Typography variant="body2" color="textSecondary">
                                            Para PDF, preencha título, descrição e área. Selecione o arquivo e salve.
                                        </Typography>
                                    </>
                                )}
                            </Paper>
                        </Grid>

                        {values.tutorialType === TUTORIAL_TYPES.pdf && (
                            <Grid xs={12} item>
                                <Paper variant="outlined" style={{ padding: 12 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        PDF do tutorial (máx. 25MB)
                                    </Typography>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                                        {(record.attachments || []).length === 0 && !pendingPdfFile && (
                                            <Typography variant="body2" color="textSecondary">
                                                Nenhum PDF anexado.
                                            </Typography>
                                        )}
                                        {pendingPdfFile && (
                                            <Chip
                                                icon={<AttachFileIcon />}
                                                label={pendingPdfFile.name}
                                                onDelete={() => setPendingPdfFile(null)}
                                                deleteIcon={<DeleteIcon />}
                                                variant="outlined"
                                            />
                                        )}
                                        {(record.attachments || []).map((att) => (
                                            <Chip
                                                key={att.id}
                                                icon={<AttachFileIcon />}
                                                label={
                                                    <Link
                                                        href={`${backendUrl}/public/${att.path}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {att.name}
                                                    </Link>
                                                }
                                                onDelete={() => onRemoveAttachment(att.id)}
                                                deleteIcon={<DeleteIcon />}
                                                variant="outlined"
                                            />
                                        ))}
                                    </div>
                                    <ButtonWithSpinner
                                        loading={uploading}
                                        variant="outlined"
                                        component="label"
                                        startIcon={<AttachFileIcon />}
                                    >
                                        Anexar PDF
                                        <input
                                            type="file"
                                            hidden
                                            accept="application/pdf"
                                            onChange={handleFileChange}
                                        />
                                    </ButtonWithSpinner>
                                </Paper>
                            </Grid>
                        )}

                        <Grid sm={3} md={1} item>
                            <ButtonWithSpinner className={classes.fullWidth} loading={loading} onClick={() => onCancel()} variant="contained">
                            {i18n.t("helps.settings.clear")}
                            </ButtonWithSpinner>
                        </Grid>
                        { record.id !== undefined ? (
                            <Grid sm={3} md={1} item>
                                <ButtonWithSpinner className={classes.fullWidth} loading={loading} onClick={() => onDelete(record)} variant="contained" color="secondary">
                                {i18n.t("helps.settings.delete")}
                                </ButtonWithSpinner>
                            </Grid>
                        ) : null}
                        <Grid sm={3} md={1} item>
                            <ButtonWithSpinner className={classes.fullWidth} loading={loading} type="submit" variant="contained" color="primary">
                            {i18n.t("helps.settings.save")}
                            </ButtonWithSpinner>
                        </Grid>
                    </Grid>
                </Form>
            )}
        </Formik>
    )
}

export function HelpsManagerGrid (props) {
    const { records, onSelect } = props
    const classes = useStyles()

    return (
        <Paper className={classes.tableContainer}>
            <Table className={classes.fullWidth} size="small" aria-label="a dense table">
                <TableHead>
                <TableRow>
                    <TableCell align="center" style={{width: '1%'}}>#</TableCell>
                    <TableCell align="left">Título</TableCell>
                    <TableCell align="left">Tipo</TableCell>
                    <TableCell align="left">{i18n.t("helps.settings.description")}</TableCell>
                    <TableCell align="left">Área</TableCell>
                    <TableCell align="left">{i18n.t("helps.tutorialTypes.video")}</TableCell>
                </TableRow>
                </TableHead>
                <TableBody>
                {records.map((row) => (
                    <TableRow key={row.id}>
                        <TableCell align="center" style={{width: '1%'}}>
                            <IconButton onClick={() => onSelect(row)} aria-label="delete">
                                <EditIcon />
                            </IconButton>
                        </TableCell>
                        <TableCell align="left">{row.title || '-'}</TableCell>
                        <TableCell align="left">
                            {inferTutorialType(row) === TUTORIAL_TYPES.video && "Vídeo"}
                            {inferTutorialType(row) === TUTORIAL_TYPES.markdown && "Markdown"}
                            {inferTutorialType(row) === TUTORIAL_TYPES.pdf && "PDF"}
                        </TableCell>
                        <TableCell align="left">{row.description || '-'}</TableCell>
                        <TableCell align="left">{getAreaLabel(row.areaKey, row.areaKey) || '-'}</TableCell>
                        <TableCell align="left">{row.video || '-'}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </Paper>
    )
}

const emptyRecord = {
    title: '',
    description: '',
    content: '',
    areaKey: '',
    video: '',
    tutorialType: TUTORIAL_TYPES.video,
    attachments: []
}

const getEmptyRecord = (areaKey = '') => ({
    ...emptyRecord,
    areaKey: areaKey || ''
})

export default function HelpsManager ({ onChange, initialRecordId, initialAreaKey } = {}) {
    const classes = useStyles()
    const {
        list, save, update, remove,
        listAreas, uploadAttachment, removeAttachment
    } = useHelps()

    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [records, setRecords] = useState([])
    const [areas, setAreas] = useState([])
    const [record, setRecord] = useState(() => getEmptyRecord(initialAreaKey))

    useEffect(() => {
        async function fetchData () {
            const helpList = await loadHelps()
            if (initialRecordId) {
                const selected = helpList.find((item) => String(item.id) === String(initialRecordId))
                if (selected) {
                    setRecord(toRecord(selected))
                }
            } else {
                setRecord(getEmptyRecord(initialAreaKey))
            }
            await loadAreas()
        }
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialRecordId, initialAreaKey])

    const loadAreas = async () => {
        try {
            const data = await listAreas()
            setAreas(data || [])
        } catch (e) {
            // áreas não são críticas para o CRUD; só loga
            setAreas([])
        }
    }

    const loadHelps = async () => {
        setLoading(true)
        let helpList = []
        try {
            helpList = await list()
            setRecords(helpList)
        } catch (e) {
            toast.error('Não foi possível carregar a lista de registros')
        }
        setLoading(false)
        return helpList
    }

    const notifyChange = async () => {
        try {
            if (onChange) {
                await onChange()
            }
        } catch (e) {
            // A atualização externa é complementar; o CRUD local já foi concluído.
        }
    }

    const handleSubmit = async (data, pendingPdfFile) => {
        const { tutorialType, ...payload } = data
        const hasPdfAttachment = (payload.attachments || []).some(
            (att) => att.mimetype === "application/pdf" || att.type === "pdf"
        )
        delete payload.attachments
        if (tutorialType === TUTORIAL_TYPES.video && !payload.video) {
            toast.error('Informe a URL do vídeo.')
            return
        }
        if (tutorialType === TUTORIAL_TYPES.markdown && !payload.content) {
            toast.error('Informe o conteúdo em Markdown.')
            return
        }
        if (tutorialType === TUTORIAL_TYPES.pdf && !pendingPdfFile && !hasPdfAttachment) {
            toast.error('Selecione um PDF antes de salvar.')
            return
        }
        if (tutorialType === TUTORIAL_TYPES.markdown) {
            payload.video = ''
        }
        if (tutorialType === TUTORIAL_TYPES.pdf) {
            payload.video = ''
            payload.content = ''
        }

        setLoading(true)
        try {
            let savedRecord
            if (payload.id !== undefined) {
                savedRecord = await update(payload)
            } else {
                savedRecord = await save(payload)
            }
            if (tutorialType === TUTORIAL_TYPES.pdf && pendingPdfFile && savedRecord?.id) {
                await uploadAttachment(savedRecord.id, pendingPdfFile)
                savedRecord = {
                    ...savedRecord,
                    attachments: await list()
                        .then((helpList) => helpList.find((item) => item.id === savedRecord.id)?.attachments || [])
                }
            }
            await loadHelps()
            await notifyChange()
            if (tutorialType === TUTORIAL_TYPES.pdf && savedRecord?.id) {
                setRecord({
                    ...toRecord(savedRecord),
                    tutorialType: TUTORIAL_TYPES.pdf
                })
            } else {
                handleCancel()
            }
            toast.success('Operação realizada com sucesso!')
        } catch (e) {
            toast.error('Não foi possível realizar a operação. Verifique se já existe uma helpo com o mesmo nome ou se os campos foram preenchidos corretamente')
        }
        setLoading(false)
    }

    const handleDelete = async () => {
        setLoading(true)
        try {
            await remove(record.id)
            await loadHelps()
            await notifyChange()
            handleCancel()
            toast.success('Operação realizada com sucesso!')
        } catch (e) {
            toast.error('Não foi possível realizar a operação')
        }
        setLoading(false)
    }

    const handleOpenDeleteDialog = () => {
        setShowConfirmDialog(true)
    }

    const handleCancel = () => {
        setRecord(getEmptyRecord(initialAreaKey))
    }

    const toRecord = (data) => ({
        id: data.id,
        title: data.title || '',
        description: data.description || '',
        content: data.content || '',
        areaKey: data.areaKey || '',
        video: data.video || '',
        tutorialType: inferTutorialType(data),
        attachments: data.attachments || []
    })

    const handleSelect = (data) => {
        setRecord(toRecord(data))
    }

    const refreshSelected = async (id) => {
        const helpList = await list()
        setRecords(helpList)
        const fresh = helpList.find((r) => r.id === id)
        if (fresh) {
            setRecord(toRecord(fresh))
        }
    }

    const handleUploadAttachment = async (file) => {
        if (record.id === undefined) return
        setUploading(true)
        try {
            await uploadAttachment(record.id, file)
            await refreshSelected(record.id)
            await notifyChange()
            toast.success('Anexo adicionado com sucesso!')
        } catch (e) {
            toast.error('Não foi possível enviar o anexo. Verifique o tipo (imagem/PDF) e o tamanho (máx. 25MB).')
        }
        setUploading(false)
    }

    const handleRemoveAttachment = async (attachmentId) => {
        if (record.id === undefined) return
        setUploading(true)
        try {
            await removeAttachment(record.id, attachmentId)
            await refreshSelected(record.id)
            await notifyChange()
            toast.success('Anexo removido com sucesso!')
        } catch (e) {
            toast.error('Não foi possível remover o anexo')
        }
        setUploading(false)
    }

    return (
        <Paper className={classes.mainPaper} elevation={0}>
            <Grid spacing={2} container>
                <Grid xs={12} item>
                    <HelpManagerForm
                        initialValue={record}
                        onDelete={handleOpenDeleteDialog}
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                        loading={loading}
                        areas={areas}
                        uploading={uploading}
                        onUploadAttachment={handleUploadAttachment}
                        onRemoveAttachment={handleRemoveAttachment}
                    />
                </Grid>
                <Grid xs={12} item>
                    <HelpsManagerGrid 
                        records={records}
                        onSelect={handleSelect}
                    />
                </Grid>
            </Grid>
            <ConfirmationModal
                title="Exclusão de Registro"
                open={showConfirmDialog}
                onClose={() => setShowConfirmDialog(false)}
                onConfirm={() => handleDelete()}
            >
                Deseja realmente excluir esse registro?
            </ConfirmationModal>
        </Paper>
    )
}
