import { useState, useEffect, useRef } from "react";
import { useHistory } from "react-router-dom";
import { has, isArray } from "lodash";

import { toast } from "react-toastify";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { socketConnection } from "../../services/socket";
import { isSocketClientReady } from "../../utils/socketClient";
// import { useDate } from "../../hooks/useDate";
import moment from "moment";

const readStoredToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    return JSON.parse(token);
  } catch {
    return token;
  }
};

const useAuth = () => {
  const history = useHistory();
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({});
  const [socket, setSocket] = useState(null);

  const userRef = useRef(user);
  userRef.current = user;

  const socketRef = useRef(socket);
  socketRef.current = socket;

  useEffect(() => {
    const reqInterceptor = api.interceptors.request.use(
      (config) => {
        const token = readStoredToken();
        if (token) {
          config.headers["Authorization"] = `Bearer ${token}`;
          setIsAuth(true);
        }
        return config;
      },
      (error) => {
        Promise.reject(error);
      }
    );

    const resInterceptor = api.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        if (error?.response?.status === 403 && !originalRequest._retry) {
          originalRequest._retry = true;

          const { data } = await api.post("/auth/refresh_token");
          if (data) {
            localStorage.setItem("token", JSON.stringify(data.token));
            api.defaults.headers.Authorization = `Bearer ${data.token}`;
          }
          return api(originalRequest);
        }
        if (error?.response?.status === 401) {
          localStorage.removeItem("token");
          api.defaults.headers.Authorization = undefined;
          setIsAuth(false);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(reqInterceptor);
      api.interceptors.response.eject(resInterceptor);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    (async () => {
      if (token) {
        try {
          const { data } = await api.post("/auth/refresh_token");
          api.defaults.headers.Authorization = `Bearer ${data.token}`;
          setIsAuth(true);
          setUser(data.user);
        } catch (err) {
          toastError(err);
        }
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (Object.keys(user).length && user.id > 0) {
      let io;
      if (!socketRef.current || !isSocketClientReady(socketRef.current)) {
        io = socketConnection({ user });
        setSocket(io);
      } else {
        io = socketRef.current;
      }

      const companyId = user.companyId;
      const userId = user.id;

      const onUserUpdate = (data) => {
        if (data.action === "update" && data.user.id === userId) {
          setUser(data.user);
        }
      };

      io.on(`company-${companyId}-user`, onUserUpdate);

      return () => {
        io.off(`company-${companyId}-user`, onUserUpdate);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.companyId]);

  const handleLogin = async (userData) => {
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", userData);
      const {
        user: { company },
      } = data;

      if (has(company, "companieSettings") && isArray(company.companieSettings[0])) {
        const setting = company.companieSettings[0].find(
          (s) => s.key === "campaignsEnabled"
        );
        if (setting && setting.value === "true") {
          localStorage.setItem("cshow", null); //regra pra exibir campanhas
        }
      }

      if (has(company, "companieSettings") && isArray(company.companieSettings[0])) {
        const setting = company.companieSettings[0].find(
          (s) => s.key === "sendSignMessage"
        );

        const signEnable = setting.value === "enable";

        if (setting && setting.value === "enabled") {
          localStorage.setItem("sendSignMessage", signEnable); //regra pra exibir campanhas
        }
      }
      localStorage.setItem("profileImage", data.user.profileImage); //regra pra exibir imagem contato

      moment.locale("pt-br");

      const isSuper = Boolean(data.user?.super);
      let dueDateRaw = company?.dueDate;

      if (company?.id === 1) {
        dueDateRaw = "2999-12-31T23:59:59.000Z";
      } else if (
        dueDateRaw == null ||
        (typeof dueDateRaw === "string" && String(dueDateRaw).trim() === "") ||
        !moment(dueDateRaw).isValid()
      ) {
        /* Empresa nova ou sem vencimento: não bloquear login com “Data inválida”. */
        dueDateRaw = "2999-12-31T23:59:59.000Z";
      }

      const due = moment(dueDateRaw);
      const vencimento = due.format("DD/MM/YYYY");
      const subscriptionOk =
        isSuper ||
        due.endOf("day").isSameOrAfter(moment(), "day");

      const dias = Math.ceil(due.endOf("day").diff(moment(), "days", true));

      if (subscriptionOk) {
        localStorage.setItem("token", JSON.stringify(data.token));
        // localStorage.setItem("public-token", JSON.stringify(data.user.token));
        // localStorage.setItem("companyId", companyId);
        // localStorage.setItem("userId", id);
        localStorage.setItem("companyDueDate", vencimento);
        api.defaults.headers.Authorization = `Bearer ${data.token}`;
        setUser(data.user);
        setIsAuth(true);
        toast.success(i18n.t("auth.toasts.success"));
        if (!isSuper && Math.round(dias) < 5 && Math.round(dias) >= 0) {
          toast.warn(
            `Sua assinatura vence em ${Math.round(dias)} ${
              Math.round(dias) === 1 ? "dia" : "dias"
            } `
          );
        }

        // // Atraso para garantir que o cache foi limpo
        // setTimeout(() => {
        //   window.location.reload(true); // Recarregar a página
        // }, 1000);

        const from = history.location?.state?.from;
        const redirectPath =
          from?.pathname && from.pathname !== "/login"
            ? `${from.pathname || ""}${from.search || ""}${from.hash || ""}`
            : "/tickets";
        history.push(redirectPath);
        setLoading(false);
      } else {
        // localStorage.setItem("companyId", companyId);
        api.defaults.headers.Authorization = `Bearer ${data.token}`;
        setIsAuth(true);
        toastError(`Opss! Sua assinatura venceu ${vencimento}.
Entre em contato com o Suporte para mais informações! `);
        history.push("/financeiro-aberto");
        setLoading(false);
      }

    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);

    try {
      // socket.disconnect();
      await api.delete("/auth/logout");
      setIsAuth(false);
      setUser({});
      setSocket(null);
      localStorage.removeItem("token");
      localStorage.removeItem("cshow");
      // localStorage.removeItem("public-token");
      api.defaults.headers.Authorization = undefined;
      setLoading(false);
      history.push("/login");
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const getCurrentUserInfo = async () => {
    try {
      const { data } = await api.get("/auth/me");
      return data;
    } catch (_) {
      return null;
    }
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.post("/auth/refresh_token");
      if (data?.user) {
        setUser(data.user);
        if (data.token) {
          localStorage.setItem("token", JSON.stringify(data.token));
          api.defaults.headers.Authorization = `Bearer ${data.token}`;
        }
      }
    } catch (_) {
      /* ignore */
    }
  };

  return {
    isAuth,
    user,
    loading,
    handleLogin,
    handleLogout,
    getCurrentUserInfo,
    refreshUser,
    socket
  };
};

export default useAuth;
