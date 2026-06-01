import React from "react";
import { useHistory } from "react-router-dom";
import {
    IconButton,
    Tooltip,
    makeStyles
} from "@material-ui/core";
import {
    HelpOutline as HelpOutlineIcon
} from "@material-ui/icons";

const useStyles = makeStyles((theme) => ({
    hintButton: {
        marginLeft: theme.spacing(0.75),
        padding: 4,
        color: theme.palette.primary.main,
        backgroundColor: theme.mode === "light" ? "rgba(0, 150, 136, 0.08)" : "rgba(255,255,255,0.08)",
        border: `1px solid ${theme.palette.primary.main}`,
        "&:hover": {
            backgroundColor: theme.palette.primary.main,
            color: "#fff"
        }
    },
    hintIcon: {
        fontSize: "1.15rem"
    }
}));

const HelpHint = ({ areaKey, size = "small" }) => {
    const classes = useStyles();
    const history = useHistory();

    const handleOpen = () => {
        history.push(`/tutoriais?area=${areaKey}`);
    };

    return (
        <Tooltip title="Ver tutoriais desta seção">
            <IconButton
                className={classes.hintButton}
                size={size}
                onClick={handleOpen}
                aria-label="Tutoriais desta seção"
            >
                <HelpOutlineIcon className={classes.hintIcon} />
            </IconButton>
        </Tooltip>
    );
};

export default HelpHint;
