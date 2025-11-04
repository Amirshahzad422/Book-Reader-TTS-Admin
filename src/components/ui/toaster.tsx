"use client";

import * as React from "react";
import { Toast, ToastProps } from "./toast";
import { createPortal } from "react-dom";

interface ToasterContextType {
  toasts: Omit<ToastProps, "onClose">[];
  addToast: (toast: Omit<ToastProps, "id" | "onClose">) => void;
  removeToast: (id: string) => void;
}

const ToasterContext = React.createContext<ToasterContextType | undefined>(
  undefined
);

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Omit<ToastProps, "onClose">[]>([]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const addToast = React.useCallback(
    (toast: Omit<ToastProps, "id" | "onClose">) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { ...toast, id }]);
    },
    []
  );

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToasterContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed top-4 right-4 z-50 flex flex-col items-end pointer-events-none">
            <div className="pointer-events-auto">
              {toasts.map((toast) => (
                <Toast key={toast.id} {...toast} onClose={removeToast} />
              ))}
            </div>
          </div>,
          document.body
        )}
    </ToasterContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToasterContext);
  if (!context) {
    throw new Error("useToast must be used within ToasterProvider");
  }

  return {
    toast: {
      success: (title: string, description?: string, duration?: number) =>
        context.addToast({ title, description, type: "success", duration }),
      error: (title: string, description?: string, duration?: number) =>
        context.addToast({ title, description, type: "error", duration }),
      warning: (title: string, description?: string, duration?: number) =>
        context.addToast({ title, description, type: "warning", duration }),
      info: (title: string, description?: string, duration?: number) =>
        context.addToast({ title, description, type: "info", duration }),
    },
  };
}
