import { toast as sonner } from "ngx-sonner";

/**
 * Fachada de toasts sobre ngx-sonner (renderizado por el `<hlm-toaster />`
 * del shell). Único punto de acceso al vendor: los consumidores importan
 * de aquí, nunca de ngx-sonner directo.
 */
interface ToastOpts {
  description?: string;
}

export const toast = Object.assign(
  (message: string, opts?: ToastOpts): void => {
    sonner(message, opts);
  },
  {
    success: (message: string, opts?: ToastOpts): void => {
      sonner.success(message, opts);
    },
    error: (message: string, opts?: ToastOpts): void => {
      sonner.error(message, opts);
    },
  },
);
