import React, {
  useState,
  useEffect,
  useReducer,
  useContext,
} from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom"; // Importe o useHistory

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import IconButton from "@material-ui/core/IconButton";
import SearchIcon from "@material-ui/icons/Search";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";

import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import HelpHint from "../../components/HelpHint";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import TagModal from "../../components/TagModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { Chip, FormControl, FormHelperText, InputLabel, MenuItem, Select } from "@material-ui/core";
// import { SocketContext } from "../../context/Socket/SocketContext";
import { AuthContext } from "../../context/Auth/AuthContext";

const reducer = (state, action) => {
  if (action.type === "LOAD_TAGS") {
    const tags = action.payload;
    const newTags = [];

    tags.forEach((tag) => {
      const tagIndex = state.findIndex((s) => s.id === tag.id);
      if (tagIndex !== -1) {
        state[tagIndex] = tag;
      } else {
        newTags.push(tag);
      }
    });

    return [...state, ...newTags];
  }

  if (action.type === "UPDATE_TAGS") {
    const tag = action.payload;
    const tagIndex = state.findIndex((s) => s.id === tag.id);

    if (tagIndex !== -1) {
      state[tagIndex] = tag;
      return [...state];
    } else {
      return [tag, ...state];
    }
  }

  if (action.type === "DELETE_TAGS") {
    const tagId = action.payload;

    const tagIndex = state.findIndex((s) => s.id === tagId);
    if (tagIndex !== -1) {
      state.splice(tagIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
}));

const Tags = () => {
  const classes = useStyles();
  const history = useHistory(); // Inicialize o useHistory

  //   const socketManager = useContext(SocketContext);
  const { user, socket } = useContext(AuthContext);


  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [deletingTag, setDeletingTag] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [tags, dispatch] = useReducer(reducer, []);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [quadroGroups, setQuadroGroups] = useState([]);
  const [selectedQuadroGroupId, setSelectedQuadroGroupId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/quadro-groups");
        const list = data.groups || data.lista || data || [];
        const groups = Array.isArray(list) && list.length > 0 ? list : [];
        if (!cancelled) {
          setQuadroGroups(groups);
          if (groups.length > 0) {
            setSelectedQuadroGroupId((prev) =>
              prev !== "" && prev != null ? prev : String(groups[0].id)
            );
          }
        }
      } catch (e) {
        if (!cancelled) setQuadroGroups([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchTags = async () => {
        if (!selectedQuadroGroupId) {
          dispatch({ type: "RESET" });
          setLoading(false);
          setHasMore(false);
          return;
        }
        try {
          const { data } = await api.get("/tags/", {
            params: {
              searchParam,
              pageNumber,
              kanban: 1,
              quadroGroupId: selectedQuadroGroupId,
            },
          });
          dispatch({ type: "LOAD_TAGS", payload: data.tags });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchTags();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber, selectedQuadroGroupId]);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam, selectedQuadroGroupId]);

  useEffect(() => {
    // const socket = socketManager.GetSocket(user.companyId, user.id);

    const onTagsEvent = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_TAGS", payload: data.tag });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_TAGS", payload: +data.tagId });
      }
    };
    socket.on(`company${user.companyId}-tag`, onTagsEvent);

    return () => {
      socket.off(`company${user.companyId}-tag`, onTagsEvent);
    };
  }, [socket]);

  const handleOpenTagModal = () => {
    setSelectedTag(null);
    setTagModalOpen(true);
  };

  const handleCloseTagModal = () => {
    setSelectedTag(null);
    setTagModalOpen(false);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditTag = (tag) => {
    setSelectedTag(tag);
    setTagModalOpen(true);
  };

  const handleDeleteTag = async (tagId) => {
    try {
      await api.delete(`/tags/${tagId}`);
      toast.success(i18n.t("tagsKanban.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingTag(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const handleReturnToKanban = () => {
    history.push("/kanban");
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={deletingTag && `${i18n.t("tagsKanban.confirmationModal.deleteTitle")}`}
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteTag(deletingTag.id)}
      >
        {i18n.t("tagsKanban.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      {tagModalOpen && (
        <TagModal
          open={tagModalOpen}
          onClose={handleCloseTagModal}
          aria-labelledby="form-dialog-title"
          tagId={selectedTag && selectedTag.id}
          kanban={1}
          quadroGroupId={selectedQuadroGroupId}
        />
      )}
      <MainHeader>
        <span style={{ display: "flex", alignItems: "center" }}>
          <Title>{i18n.t("tagsKanban.title")} ({tags.length})</Title>
          <HelpHint areaKey="kanban" />
        </span>
        <MainHeaderButtonsWrapper>
          <FormControl variant="outlined" size="small" style={{ minWidth: 220, marginRight: 8 }}>
            <InputLabel id="tags-kanban-area-label">
              {i18n.t("tagsKanban.quadroSelectorLabel")}
            </InputLabel>
            <Select
              labelId="tags-kanban-area-label"
              label={i18n.t("tagsKanban.quadroSelectorLabel")}
              value={selectedQuadroGroupId}
              onChange={(e) => setSelectedQuadroGroupId(e.target.value)}
            >
              {quadroGroups.map((g) => (
                <MenuItem key={g.id} value={String(g.id)}>
                  {g.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{i18n.t("tagsKanban.quadroSelectorHelper")}</FormHelperText>
          </FormControl>
          <TextField
            placeholder={i18n.t("contacts.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "gray" }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenTagModal}
          >
            {i18n.t("tagsKanban.buttons.add")}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleReturnToKanban}
          >
            {i18n.t("tagsKanban.buttons.backToKanban")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper
        className={classes.mainPaper}
        variant="outlined"
        onScroll={handleScroll}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">{i18n.t("tagsKanban.table.name")}</TableCell>
              <TableCell align="center">{i18n.t("tagsKanban.table.tickets")}</TableCell>
              <TableCell align="center">{i18n.t("tagsKanban.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {tags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell align="center">
                    <Chip
                      variant="outlined"
                      style={{
                        backgroundColor: tag.color,
                        textShadow: "1px 1px 1px #000",
                        color: "white",
                      }}
                      label={tag.name}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">{tag?.ticketTags ? (<span>{tag?.ticketTags?.length}</span>) : <span>0</span>}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleEditTag(tag)}>
                      <EditIcon />
                    </IconButton>

                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setConfirmModalOpen(true);
                        setDeletingTag(tag);
                      }}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={4} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Tags;
