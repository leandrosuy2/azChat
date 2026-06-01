/**
 * Lista fixa de áreas do sistema às quais um tutorial (Help) pode ser
 * vinculado via `areaKey`. O ícone <HelpHint areaKey="..."> no frontend
 * usa essas mesmas chaves. Manter o espelho do frontend em sincronia:
 * frontend/src/constants/helpAreas.js
 *
 * Adicionar uma nova área: incluir aqui e no espelho do frontend, depois
 * plantar <HelpHint areaKey="nova-chave" /> no componente correspondente.
 */
export interface HelpArea {
  key: string;
  label: string;
}

export const HELP_AREAS: HelpArea[] = [
  { key: "dashboard", label: "Dashboard / Relatórios" },
  { key: "moments", label: "Atendimentos em tempo real" },
  { key: "tickets", label: "Atendimentos" },
  { key: "notifications", label: "Notificações" },
  { key: "quick-messages", label: "Respostas rápidas" },
  { key: "kanban", label: "Kanban" },
  { key: "connections", label: "Conexões" },
  { key: "all-connections", label: "Todas as conexões" },
  { key: "contacts", label: "Contatos" },
  { key: "contact-lists", label: "Listas de contatos" },
  { key: "tags", label: "Tags" },
  { key: "schedules", label: "Agendamentos" },
  { key: "chats", label: "Chat interno" },
  { key: "helps", label: "Ajuda" },
  { key: "tutorials", label: "Tutoriais" },
  { key: "campaigns", label: "Campanhas" },
  { key: "campaigns-config", label: "Configurações de campanhas" },
  { key: "flowbuilder", label: "Construtor de fluxo" },
  { key: "announcements", label: "Informativos" },
  { key: "messages-api", label: "API de mensagens" },
  { key: "users", label: "Usuários e permissões" },
  { key: "queues", label: "Filas / Chatbot" },
  { key: "prompts", label: "Prompts / OpenAI" },
  { key: "queue-integration", label: "Integrações" },
  { key: "files", label: "Arquivos" },
  { key: "budgets", label: "Orçamentos / OS" },
  { key: "settings", label: "Configurações" },
  { key: "companies", label: "Empresas" }
];

export const HELP_AREA_KEYS = HELP_AREAS.map(a => a.key);

export const isValidHelpAreaKey = (key?: string | null): boolean =>
  !key || HELP_AREA_KEYS.includes(key);
