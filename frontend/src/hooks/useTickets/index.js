import { useState, useEffect, useRef } from "react";
import toastError from "../../errors/toastError";
import { format, sub } from 'date-fns'
import api from "../../services/api";

const useTickets = ({
  searchParam,
  tags,
  users,
  pageNumber,
  status,
  date,
  updatedAt,
  showAll,
  queueIds,
  withUnreadMessages,
  whatsappIds,
  statusFilter,
  forceSearch,
  userFilter,
  sortTickets,
  searchOnMessages,
  unreadOnly,
  groupsOnly,
}) => {
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [count, setCount] = useState(0);
  const requestSeq = useRef(0);

  useEffect(() => {
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    let active = true;
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchTickets = async () => {
        if (userFilter === undefined || userFilter === null) {
          try {
            const params = {
              searchParam,
              pageNumber,
              tags,
              users,
              status,
              date,
              updatedAt,
              showAll,
              queueIds,
              withUnreadMessages,
              whatsapps: whatsappIds,
              statusFilter,
              sortTickets,
              searchOnMessages,
              unreadOnly,
              groupsOnly,
            };

            const { data } = await api.get("/tickets", { params });
            if (!active || requestSeq.current !== seq) return;

            let tickets = [];
            tickets = data.tickets;

            setTickets(tickets);
            setHasMore(data.hasMore);
            setCount(data.count)
            setLoading(false);
            if (
              process.env.NODE_ENV === "development" &&
              typeof window !== "undefined" &&
              localStorage.getItem("DEBUG_TICKETS") !== "0"
            ) {
              // eslint-disable-next-line no-console
              console.log("[TicketsDebug] useTickets: GET /tickets retornou", {
                status,
                pageNumber,
                qtd: Array.isArray(tickets) ? tickets.length : null,
                hasMore: data.hasMore,
              });
            }
          } catch (err) {
            if (!active || requestSeq.current !== seq) return;
            setLoading(false);
            toastError(err);
          }
        } else {
          try {
            // console.log("ENTROU AQUI DASH")
            // console.log(status,
            //   showAll,
            //   queueIds,
            //   format(sub(new Date(), { days: 30 }), 'yyyy-MM-dd'),
            //   format(new Date(), 'yyyy-MM-dd'),
            //   userFilter)

            const {data} = await api.get("/dashboard/moments", {
              params: {
                status,
                showAll,
                queueIds,
                dateStart: format(sub(new Date(), { days: 30 }), 'yyyy-MM-dd'),
                dateEnd: format(new Date(), 'yyyy-MM-dd'),
                userId: userFilter
              }
            })
            if (!active || requestSeq.current !== seq) return;

            // console.log(data)
            let tickets = [];
            tickets = data.filter(item => item.userId == userFilter);            

            setTickets(tickets);
            setHasMore(null);
            setLoading(false);
          } catch (err) {
            if (!active || requestSeq.current !== seq) return;
            setLoading(false);
            toastError(err);
          }
        }
      };
    fetchTickets();
    }, 500);
    return () => {
      active = false;
      clearTimeout(delayDebounceFn);
    };
  }, [
    searchParam,
    tags,
    users,
    pageNumber,
    status,
    date,
    updatedAt,
    showAll,
    queueIds,
    withUnreadMessages,
    whatsappIds,
    statusFilter,
    forceSearch,
    sortTickets,
    searchOnMessages,
    unreadOnly,
    groupsOnly,
  ]);

  return { tickets, loading, hasMore, count };
};

export default useTickets;
