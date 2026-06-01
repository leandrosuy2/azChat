import React from "react";

import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import InstagramIcon from "@material-ui/icons/Instagram";
import FacebookIcon from "@material-ui/icons/Facebook";
import ChatIcon from "@material-ui/icons/Chat";

/**
 * @param {"inherit"|"default"|"small"|"large"} fontSize
 */
const ConnectionIcon = ({ connectionType, fontSize = "small" }) => {
    const ch = typeof connectionType === "string" ? connectionType.toLowerCase() : connectionType;
    const style = { display: "block" };

    return (
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 0 }}>
            {ch === "whatsapp" && (
                <WhatsAppIcon fontSize={fontSize} style={{ ...style, color: "#25D366" }} />
            )}
            {ch === "instagram" && (
                <InstagramIcon fontSize={fontSize} style={{ ...style, color: "#e1306c" }} />
            )}
            {ch === "facebook" && (
                <FacebookIcon fontSize={fontSize} style={{ ...style, color: "#3b5998" }} />
            )}
            {ch !== "whatsapp" && ch !== "instagram" && ch !== "facebook" && (
                <ChatIcon fontSize={fontSize} style={style} color="action" titleAccess={ch ? String(ch) : undefined} />
            )}
        </span>
    );
};

export default ConnectionIcon;
