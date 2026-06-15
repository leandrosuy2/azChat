export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      if (process.env.NODE_ENV !== "production") {
        unregister();
        return;
      }

      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      fetch(swUrl, { headers: { "Service-Worker": "script" } })
        .then((response) => {
          const contentType = response.headers.get("content-type") || "";
          if (
            response.status === 404 ||
            !contentType.includes("javascript")
          ) {
            unregister();
            return null;
          }
          return navigator.serviceWorker.register(swUrl);
        })
        .then((registration) => {
          if (registration) {
            console.log('Service worker registrado com sucesso!', registration);
          }
        })
        .catch((error) => {
          console.error('Erro durante o registro do service worker:', error);
          unregister();
        });
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error('Erro durante o desregistro do service worker:', error);
      });
  }
}
