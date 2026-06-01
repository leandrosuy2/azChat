import React, { useEffect, useState, useContext } from 'react';
import { Dialog, DialogTitle, DialogActions, Button, Box, } from '@material-ui/core';
import { i18n } from '../../translate/i18n';
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
import { Can } from "../Can";

import { AuthContext } from "../../context/Auth/AuthContext";
import * as XLSX from "xlsx";
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';
const useStyles = makeStyles((theme) => ({
  multFieldLine: {
    display: "flex",
    // "& > *:not(:last-child)": {
    //   marginRight: theme.spacing(1),
    // },
    marginTop: 8,
  },
  uploadInput: {
    display: "none",
  },

  btns: {

    margin: 15,

  },
  label: {
    padding: 18,
    width: "100%",
    textTransform: 'uppercase',
    display: 'block',
    marginTop: 10,
    border: "solid 2px grey",
    textAlign: 'center',
    cursor: 'pointer',
    borderRadius: 8

  },

}));

const ContactImportWpModal = ({ isOpen, handleClose, selectedTags, hideNum, userProfile }) => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const history = useHistory();

  const initialContact = { name: "", number: "", error: "" }

  const [contactsToImport, setContactsToImport] = useState([])
  const [statusMessage, setStatusMessage] = useState("")
  const [currentContact, setCurrentContact] = useState(initialContact)

  const handleClosed = () => {
    setContactsToImport([])
    setStatusMessage("")
    setCurrentContact(initialContact)
    handleClose()
  }

  useEffect(() => {
    console.log(contactsToImport?.length)
    if (contactsToImport?.length) {
      contactsToImport.map(async (item, index) => {
        setTimeout(async () => {
          try {
            if (index >= contactsToImport?.length - 1) {
              setStatusMessage(`importação concluída com exito a importação`)
              //setContactsToImport([])
              setCurrentContact(initialContact)

              setTimeout(() => {
                handleClosed()
              }, 15000);
            }
            if (index % 5 === 0) {

              setStatusMessage(`importação em andamento ${index} de ${contactsToImport?.length} não saia desta tela até concluir a importação`)
              // toast.info(
              // );
            }
            console.log("antes do import: ", item[0])
            await api.post(`/contactsImport`, {
              name: item.name,
              number: item.number.toString(),
              email: item.email,
            });

            setCurrentContact({ name: item.name, number: item.number, error: "success" })
          } catch (err) {
            setCurrentContact({ name: item.name, number: item.number, error: err })
          }
        }, 330 * index);
      });
    }
  }, [contactsToImport]);

  const isLidNumber = (stored, remoteJid) => {
    if (/@lid$/i.test(remoteJid || "")) return true;
    if (!stored) return false;
    const s = String(stored);
    if (s.length >= 14 && s.length <= 16 && /^1\d+$/.test(s)) return true;
    return false;
  };

  const handleOnExportContacts = async (model = false) => {
    const allDatas = [];

    let i = 1;
    if (!model) {
      while (i !== 0) {
        const { data } = await api.get("/contacts/", {
          params: { searchParam: "", pageNumber: i, limit: 100, contactTag: JSON.stringify(selectedTags) },
        });
        data.contacts.forEach((element) => {
          const tagsContact = element?.tags?.map(tag => tag?.name).join(', ');
          allDatas.push({ ...element, tags: tagsContact });
        });

        const pages = Math.ceil(data?.count / 100);
        i++;
        if (i > pages) i = 0;
      }
    } else {
      allDatas.push({ name: "João", number: "5599999999999", email: "" });
    }

    const exportData = allDatas.map((e) => {
      const rawNum = String(e.number || "").replace(/\D/g, "");
      const lid = isLidNumber(rawNum, e.remoteJid);
      const rawName = (e.name || "").trim();
      const nameIsDigits = /^\d+$/.test(rawName.replace(/\s/g, ""));
      const nome = (!rawName || nameIsDigits) ? "" : rawName;
      const numero = lid ? "" : rawNum;
      const lidVal = lid ? String(e.number || "") : "";
      return {
        Nome: nome,
        Numero: numero,
        Email: e.email || "",
        Tags: e.tags || "",
        LID: lidVal,
      };
    });

    let wb = XLSX.utils.book_new();
    let ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Contatos");
    XLSX.writeFile(wb, "backup_contatos.xlsx");
  };

  const handleImportChange = (e) => {
    const [file] = e.target.files;
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setContactsToImport(data)
      } catch (err) {
        console.log(err);
        setContactsToImport([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };
  const handleGoToSpreadsheetImport = () => {
    handleClose();
    history.push("/contacts/import");
  };

  return (
    <Dialog fullWidth open={isOpen} onClose={handleClosed}>
      <DialogTitle>{i18n.t("Exportar / Importar contatos")}</DialogTitle>
      <div>
        <Box style={{ padding: "0px 10px 10px" }} >
          <Can
            role={user.profile}
            perform="contacts-page:deleteContact"
            yes={() => (
              <div className={classes.multFieldLine}>
                <Button
                  fullWidth
                  size="small"
                  color="primary"
                  variant="contained"
                  onClick={() => handleOnExportContacts(false)}
                >
                  {i18n.t("contactImportWpModal.title")}
                </Button>
              </div>
            )}
          />
          <div className={classes.multFieldLine}>
            <Button
              fullWidth
              size="small"
              color="primary"
              variant="contained"
              onClick={() => handleOnExportContacts(true)}
            >
              {i18n.t("contactImportWpModal.buttons.downloadModel")}
            </Button>
          </div>
          <div className={classes.multFieldLine}>
            <Button
              fullWidth
              size="small"
              color="primary"
              variant="contained"
              onClick={handleGoToSpreadsheetImport}
            >
              {i18n.t("contactImportWpModal.buttons.import")}
            </Button>
          </div>
          {/* <div className={classes.multFieldLine}>
            <div style={{ minWidth: "100%" }}>
              {contactsToImport?.length ?
                <>
                  <div className={classes.label}>
                    <h4>{statusMessage}</h4>
                    {currentContact?.name ?
                      <Button
                        fullWidth
                        disabled
                        size="small"
                        color={currentContact?.error === "success" ? "primary" : "error"}
                        variant="text"
                      >
                        {`${currentContact?.name} => ${currentContact?.number} `}
                      </Button>
                      : <></>}
                  </div>
                </> :
                <>
                  <label className={classes.label} htmlFor="contacts"> <AttachFileIcon /> <div> {i18n.t("contactImportWpModal.buttons.import")}</div> </label>
                  <input className={classes.uploadInput} name='contacts' id='contacts' type="file" accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleImportChange}
                  />
                </>
              }
            </div>
          </div> */}
        </Box>
      </div>

      <DialogActions>
        <Button onClick={handleClose} color="primary">
          {i18n.t("contactImportWpModal.buttons.closed")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContactImportWpModal;
