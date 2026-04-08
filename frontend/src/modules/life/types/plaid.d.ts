interface PlaidLinkHandler {
  open: () => void;
  exit: () => void;
  destroy: () => void;
}

interface PlaidNamespace {
  create: (options: {
    token: string;
    onSuccess: (publicToken: string, metadata?: unknown) => void;
    onExit?: (error?: unknown, metadata?: unknown) => void;
  }) => PlaidLinkHandler;
}

declare global {
  interface Window {
    Plaid?: PlaidNamespace;
  }
}

export {};
