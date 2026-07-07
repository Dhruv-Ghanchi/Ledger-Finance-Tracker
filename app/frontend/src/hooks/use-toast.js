import * as React from "react";

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

export function useToast() {
  const [toasts, setToasts] = React.useState([]);

  const toast = React.useCallback((props) => {
    setToasts((prev) => [...prev, { id: Math.random().toString(), ...props }]);
  }, []);

  const dismiss = React.useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toast, dismiss, toasts };
}