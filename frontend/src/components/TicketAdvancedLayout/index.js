import { styled } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';

const TicketAdvancedLayout = styled(Paper)({
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: "100%",
    display: "grid",
    gridTemplateRows: "56px minmax(0, 1fr)",
    overflow: "hidden",
})

export default TicketAdvancedLayout;