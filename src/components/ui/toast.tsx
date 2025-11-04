"use client";

import * as React from "react";
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaTimes,
} from "react-icons/fa";

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
  onClose: (id: string) => void;
}

export function Toast({
  id,
  title,
  description,
  type = "info",
  duration = 5000,
  onClose,
}: ToastProps) {
  const [isExiting, setIsExiting] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 300); // Wait for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 300);
  };

  const styles = {
    success: {
      bg: "bg-green-50 dark:bg-green-950/20 border-green-500",
      icon: (
        <FaCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
      ),
      text: "text-green-800 dark:text-green-300",
    },
    error: {
      bg: "bg-red-50 dark:bg-red-950/20 border-red-500",
      icon: (
        <FaExclamationCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
      ),
      text: "text-red-800 dark:text-red-300",
    },
    warning: {
      bg: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500",
      icon: (
        <FaExclamationCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
      ),
      text: "text-yellow-800 dark:text-yellow-300",
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-500",
      icon: (
        <FaInfoCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      ),
      text: "text-blue-800 dark:text-blue-300",
    },
  };

  const style = styles[type];

  return (
    <div
      className={`
        ${style.bg} ${
        style.text
      } border-l-4 rounded-lg shadow-lg p-4 mb-3 min-w-[320px] max-w-md
        transition-all duration-300 ease-in-out
        ${
          isExiting ? "opacity-0 translate-x-full" : "opacity-100 translate-x-0"
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{style.icon}</div>

        <div className="flex-1 min-w-0">
          {title && <p className="font-semibold text-sm mb-1">{title}</p>}
          {description && <p className="text-sm opacity-90">{description}</p>}
        </div>

        <button
          onClick={handleClose}
          className="flex-shrink-0 ml-2 hover:opacity-70 transition-opacity"
          aria-label="Close"
        >
          <FaTimes className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}


// import { useToast } from "@/components/ui/toaster";

// function YourComponent() {
//   const { toast } = useToast();

//   const handleSuccess = () => {
//     toast.success("Success!", "Your action completed successfully");
//   };

//   const handleError = () => {
//     toast.error("Error!", "Something went wrong");
//   };

//   const handleWarning = () => {
//     toast.warning("Warning!", "Please check your input");
//   };

//   const handleInfo = () => {
//     toast.info("Info", "This is an informational message");
//   };
// }