import { eventBus } from '../utils/eventBus';

type NotifType = 'success' | 'error' | 'info' | 'warning';

const defaultTitles: Record<NotifType, string> = {
  success: 'Éxito',
  error: 'Error',
  info: 'Información',
  warning: 'Atención',
};

export function toast(message: string, type: NotifType = 'info', title?: string) {
  eventBus.emit('SHOW_NOTIFICATION', {
    type,
    title: title ?? defaultTitles[type],
    message,
  });
}

export function appConfirm(message: string, title = '¿Confirmar acción?'): Promise<boolean> {
  return new Promise((resolve) => {
    eventBus.emit('SHOW_CONFIRM', { message, title, resolve });
  });
}

export function appPrompt(message: string, title = 'Ingresar datos', defaultValue = ''): Promise<string | null> {
  return new Promise((resolve) => {
    eventBus.emit('SHOW_PROMPT', { message, title, defaultValue, resolve });
  });
}

export function appAlert(message: string, title = 'Notificación del Sistema'): Promise<void> {
  return new Promise((resolve) => {
    eventBus.emit('SHOW_CONFIRM', { 
      message, 
      title, 
      isAlert: true,
      resolve: () => resolve() 
    });
  });
}

