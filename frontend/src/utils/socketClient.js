/**
 * Socket do AuthContext: null até o SocketWorker existir.
 * Evita chamar .on / .emit em {} ou valores inválidos.
 */
export function isSocketClientReady(socket) {
  return (
    socket != null &&
    typeof socket.on === "function" &&
    typeof socket.emit === "function" &&
    typeof socket.off === "function"
  );
}
