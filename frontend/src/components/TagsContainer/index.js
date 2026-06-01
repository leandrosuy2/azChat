import { Chip, Paper, TextField } from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import React, { useEffect, useRef, useState } from "react";
import { isArray, isString } from "lodash";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";

/** Tags de categoria no contato (kanban === 0). Outros tipos (quadro, funil) ficam só no backend. */
const isCategoryTag = (t) => t != null && Number(t.kanban) === 0;

export function TagsContainer({ contact }) {

    const [tags, setTags] = useState([]);
    const [selecteds, setSelecteds] = useState([]);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false
        }
    }, [])

    useEffect(() => {
        if (isMounted.current) {
            loadTags().then(() => {
                if (Array.isArray(contact.tags)) {
                    setSelecteds(contact.tags.filter(isCategoryTag));
                } else {
                    setSelecteds([]);
                }
            });
        }
    }, [contact]);

    const createTag = async (data) => {
        try {
            const { data: responseData } = await api.post(`/tags`, data);
            return responseData;
        } catch (err) {
            toastError(err);
        }
    }

    const loadTags = async () => {
        try {
            const { data } = await api.get(`/tags/list`, 
            {params: { kanban: 0}
        });
            setTags(data);
        } catch (err) {
            toastError(err);
        }
    }

    const syncTags = async (data) => {
        try {
            const { data: responseData } = await api.post(`/tags/sync`, data);
            return responseData;
        } catch (err) {
            toastError(err);
        }
    }

    const onChange = async (value, reason) => {
        let optionsChanged = []
        if (reason === 'create-option') {
            if (isArray(value)) {
                for (let item of value) {
                    if (item.length < 3) {
                        toastError(i18n.t("tickets.categoryNameTooShort"));
                        return;
                    }
                    if (isString(item)) {
                        const newTag = await createTag({ name: item, kanban: 0, color: getRandomHexColor() })
                        optionsChanged.push(newTag);
                    } else {
                        optionsChanged.push(item);
                    }
                }
            }
            await loadTags();
        } else {
            optionsChanged = value;
        }
        const nonCategory = Array.isArray(contact.tags)
            ? contact.tags.filter((t) => !isCategoryTag(t))
            : [];
        const merged = [...nonCategory, ...optionsChanged];
        setSelecteds(optionsChanged);
        await syncTags({ contactId: contact.id, tags: merged });
    }

    function getRandomHexColor() {
        // Gerar valores aleatórios para os componentes de cor
        const red = Math.floor(Math.random() * 256); // Valor entre 0 e 255
        const green = Math.floor(Math.random() * 256); // Valor entre 0 e 255
        const blue = Math.floor(Math.random() * 256); // Valor entre 0 e 255
      
        // Converter os componentes de cor em uma cor hexadecimal
        const hexColor = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
      
        return hexColor;
    }

    return (
        <Paper elevation={0} style={{ padding: "2px 4px", backgroundColor: "transparent" }}>
            <Autocomplete
                multiple
                size="small"
                options={tags}
                value={selecteds}
                freeSolo
                onChange={(e, v, r) => onChange(v, r)}
                getOptionLabel={(option) => option.name}
                renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                        <Chip
                            variant="outlined"
                            style={{
                                backgroundColor: option.color || '#eee',
                                color: "#FFF",
                                marginRight: 1,
                                padding: 1,
                                fontWeight: 'bold',
                                paddingLeft: 5,
                                paddingRight: 5,
                                borderRadius: 3,
                                fontSize: "0.8em",
                                whiteSpace: "nowrap"
                            }}
                            label={option.name}
                            {...getTagProps({ index })}
                            size="small"
                        />
                    ))
                }
                renderInput={(params) => (
                    <TextField
                        {...params}
                        variant="outlined"
                        placeholder={i18n.t("tickets.categoryAutocompletePlaceholder")}
                        margin="dense"
                        InputProps={{
                            ...params.InputProps,
                            style: { minHeight: 32, fontSize: 13 },
                        }}
                    />
                )}
                PaperComponent={({ children }) => (
                    <Paper
                        style={{ maxWidth: "min(360px, calc(100vw - 24px))", marginLeft: 0 }}
                    >
                        {children}
                    </Paper>
                )}
            />
        </Paper>
    )
}