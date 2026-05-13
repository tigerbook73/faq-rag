import { useState, useCallback } from "react";

interface DialogState<T> {
  open: boolean;
  data: T | null;
}

export function useDialog<T = null>() {
  const [state, setState] = useState<DialogState<T>>({ open: false, data: null });

  const openWith = useCallback((data: T) => setState({ open: true, data }), []);
  const openEmpty = useCallback(() => setState({ open: true, data: null }), []);
  const close = useCallback(() => setState({ open: false, data: null }), []);

  return {
    open: state.open,
    data: state.data,
    openWith,
    openEmpty,
    close,
    // shadcn Dialog onOpenChange compatibility
    onOpenChange: (open: boolean) => {
      if (!open) close();
    },
  };
}
