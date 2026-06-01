import React from "react";

import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import { Checkbox, ListItemText } from "@material-ui/core";
import { i18n } from "../../translate/i18n";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    minWidth: 0,
    maxWidth: "100%",
    width: "100%",
    flex: "1 1 auto",
  },
  menuListItem: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  menuItem: {
    maxHeight: 28,
    minHeight: 28,
  },
  listItemText: {
    fontSize: "0.75rem",
  },
  selectCompact: {
    fontSize: "0.75rem",
    lineHeight: 1.2,
    minHeight: 30,
    paddingTop: 5,
    paddingBottom: 5,
    display: "flex",
    alignItems: "center",
  },
}));

const TicketsQueueSelect = ({
  userQueues,
  selectedQueueIds = [],
  onChange,
}) => {
  const classes = useStyles();

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  const renderQueueSummary = (selected) => {
    const ids = Array.isArray(selected) ? selected : [];
    if (!userQueues?.length) {
      return i18n.t("ticketsQueueSelect.placeholder");
    }
    if (ids.length === 0) {
      return i18n.t("ticketsQueueSelect.placeholder");
    }
    if (ids.length === userQueues.length) {
      return i18n.t("ticketsQueueSelect.allQueues");
    }
    const picked = userQueues.filter((q) => ids.includes(q.id));
    if (picked.length === 1) {
      return picked[0].name;
    }
    return i18n.t("ticketsQueueSelect.selectedCount", { count: picked.length });
  };

  return (
    <div className={classes.root}>
      <FormControl fullWidth margin="none">
        <Select
          multiple
          displayEmpty
          variant="outlined"
          value={selectedQueueIds}
          onChange={handleChange}
          classes={{ select: classes.selectCompact }}
          style={{
            borderRadius: 6,
            height: 30,
            minHeight: 30,
            boxSizing: "border-box",
          }}
          renderValue={renderQueueSummary}
          MenuProps={{
            anchorOrigin: {
              vertical: "bottom",
              horizontal: "center",
            },
            transformOrigin: {
              vertical: "top",
              horizontal: "center",
            },
            getContentAnchorEl: null,
            PaperProps: {
              style: {
                borderRadius: "0 0 8px 8px",
              },
            },
            MenuListProps: {
              className: classes.menuListItem,
            },
          }}
        >
          {userQueues?.length > 0 &&
            userQueues.map((queue) => (
              <MenuItem
                dense
                key={queue.id}
                value={queue.id}
                className={classes.menuItem}
              >
                <Checkbox
                  style={{
                    color: queue.color,
                  }}
                  size="small"
                  color="primary"
                  checked={selectedQueueIds.indexOf(queue.id) > -1}
                />
                <ListItemText
                  primary={queue.name}
                  classes={{ primary: classes.listItemText }}
                />
              </MenuItem>
            ))}
        </Select>
      </FormControl>
    </div>
  );
};

export default TicketsQueueSelect;