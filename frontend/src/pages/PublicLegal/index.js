import React, { useEffect } from "react";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f6f8fb",
    color: "#1f2937",
    fontFamily: "Arial, sans-serif",
    padding: "40px 20px"
  },
  container: {
    maxWidth: 860,
    margin: "0 auto",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 32,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)"
  },
  title: {
    marginTop: 0,
    fontSize: 30,
    lineHeight: 1.2
  },
  sectionTitle: {
    marginTop: 28,
    fontSize: 20
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 1.65
  },
  list: {
    fontSize: 16,
    lineHeight: 1.65
  }
};

const appName = process.env.REACT_APP_APP_NAME || "AzChat";
const supportEmail = process.env.REACT_APP_PRIVACY_EMAIL || "contato@seu-dominio.com";

export const PrivacyPolicy = () => (
  <main style={styles.page}>
    <section style={styles.container}>
      <h1 style={styles.title}>Politica de Privacidade</h1>
      <p style={styles.paragraph}>
        Esta politica descreve como o {appName} trata dados usados para atendimento e comunicacao
        entre empresas e seus clientes.
      </p>

      <h2 style={styles.sectionTitle}>Dados coletados</h2>
      <p style={styles.paragraph}>
        Podemos processar dados de identificacao, mensagens, anexos, informacoes de contato e dados
        tecnicos necessarios para integrar canais como WhatsApp, Facebook e Instagram Direct.
      </p>

      <h2 style={styles.sectionTitle}>Uso dos dados</h2>
      <ul style={styles.list}>
        <li>Entregar e organizar conversas de atendimento.</li>
        <li>Permitir respostas por texto e anexos nos canais conectados.</li>
        <li>Registrar historico de tickets e contatos para a empresa usuaria.</li>
        <li>Manter seguranca, auditoria e funcionamento da plataforma.</li>
      </ul>

      <h2 style={styles.sectionTitle}>Compartilhamento</h2>
      <p style={styles.paragraph}>
        Dados podem ser transmitidos para provedores dos canais conectados, como Meta, somente quando
        necessario para enviar, receber ou processar mensagens. Nao vendemos dados pessoais.
      </p>

      <h2 style={styles.sectionTitle}>Exclusao de dados</h2>
      <p style={styles.paragraph}>
        Solicitacoes de exclusao podem ser enviadas para {supportEmail}. Para contas Meta, tambem
        mantemos um callback tecnico de exclusao de dados em nossa API.
      </p>

      <h2 style={styles.sectionTitle}>Contato</h2>
      <p style={styles.paragraph}>Duvidas sobre privacidade: {supportEmail}</p>
    </section>
  </main>
);

export const TermsOfService = () => (
  <main style={styles.page}>
    <section style={styles.container}>
      <h1 style={styles.title}>Termos de Servico</h1>
      <p style={styles.paragraph}>
        Estes termos regulam o uso do {appName} para atendimento por canais digitais.
      </p>

      <h2 style={styles.sectionTitle}>Uso permitido</h2>
      <p style={styles.paragraph}>
        O sistema deve ser usado para atendimento legitimo, respeitando leis aplicaveis, politicas dos
        provedores de canais e consentimentos necessarios dos clientes.
      </p>

      <h2 style={styles.sectionTitle}>Responsabilidades da empresa usuaria</h2>
      <ul style={styles.list}>
        <li>Manter credenciais e acessos protegidos.</li>
        <li>Enviar mensagens em conformidade com as politicas da Meta e demais provedores.</li>
        <li>Responder por conteudos, campanhas e anexos enviados por seus usuarios.</li>
        <li>Remover acessos de usuarios que nao fazem mais parte da equipe.</li>
      </ul>

      <h2 style={styles.sectionTitle}>Disponibilidade</h2>
      <p style={styles.paragraph}>
        A plataforma depende de servicos externos, como APIs da Meta e provedores de infraestrutura.
        Interrupcoes desses servicos podem afetar o funcionamento das integracoes.
      </p>

      <h2 style={styles.sectionTitle}>Contato</h2>
      <p style={styles.paragraph}>Duvidas sobre os termos: {supportEmail}</p>
    </section>
  </main>
);

export const MetaCallback = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isInstagramCallback = window.location.pathname.includes("instagram");
    const payload = {
      type: isInstagramCallback ? "instagram-oauth" : "meta-oauth",
      code: params.get("code"),
      state: params.get("state"),
      error: params.get("error") || params.get("error_reason"),
      errorDescription: params.get("error_description")
    };

    if (window.opener) {
      window.opener.postMessage(payload, window.location.origin);
      window.setTimeout(() => window.close(), 300);
    }
  }, []);

  return (
    <main style={styles.page}>
      <section style={styles.container}>
        <h1 style={styles.title}>Autorizacao Meta</h1>
        <p style={styles.paragraph}>
          Se a autorizacao foi concluida, volte para a tela de conexoes do sistema.
        </p>
        <p style={styles.paragraph}>
          <a href="/connections">Abrir conexoes</a>
        </p>
      </section>
    </main>
  );
};

export const DataDeletion = () => (
  <main style={styles.page}>
    <section style={styles.container}>
      <h1 style={styles.title}>Exclusao de dados do usuario</h1>
      <p style={styles.paragraph}>
        O {appName} permite solicitar a exclusao dos dados vinculados a uma conta Meta usada para
        conectar Facebook ou Instagram ao sistema.
      </p>

      <h2 style={styles.sectionTitle}>Como solicitar</h2>
      <p style={styles.paragraph}>
        Envie uma solicitacao para {supportEmail} informando o e-mail da conta no sistema, a empresa
        vinculada e quais conexoes Facebook ou Instagram devem ser removidas.
      </p>

      <h2 style={styles.sectionTitle}>O que sera removido</h2>
      <ul style={styles.list}>
        <li>Tokens de acesso Meta armazenados para envio e recebimento de mensagens.</li>
        <li>Vinculos ativos entre o sistema e as Paginas Facebook ou contas Instagram conectadas.</li>
        <li>Dados tecnicos de autenticacao relacionados ao login Meta.</li>
      </ul>

      <h2 style={styles.sectionTitle}>Callback tecnico</h2>
      <p style={styles.paragraph}>
        Para requisicoes automatizadas da Meta, usamos o endpoint:
      </p>
      <p style={styles.paragraph}>
        <a href={`${process.env.REACT_APP_BACKEND_URL}/meta/data-deletion`}>
          {process.env.REACT_APP_BACKEND_URL}/meta/data-deletion
        </a>
      </p>

      <h2 style={styles.sectionTitle}>Contato</h2>
      <p style={styles.paragraph}>Solicitacoes e duvidas: {supportEmail}</p>
    </section>
  </main>
);
