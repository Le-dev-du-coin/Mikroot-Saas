/**
 * Gestionnaire d'événements global pour le portefeuille Mikroot
 * Permet de synchroniser instantanément le solde affiché dans la Sidebar et le Header
 * dès qu'une action de débit ou de crédit a lieu.
 */

type WalletListener = (newBalance: number) => void;
const listeners: Set<WalletListener> = new Set();

export const walletEvents = {
  subscribe(listener: WalletListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  emitBalanceUpdated(newBalance: number) {
    listeners.forEach((listener) => {
      try {
        listener(newBalance);
      } catch {
        // Ignorer
      }
    });
  },
};
