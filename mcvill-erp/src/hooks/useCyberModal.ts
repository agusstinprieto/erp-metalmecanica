import { useState, useCallback } from 'react';
import type { ModalType } from '../components/common/CyberModal';

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: ModalType;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const useCyberModal = () => {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showModal = useCallback((config: Omit<ModalState, 'isOpen'>) => {
    setModal({
      ...config,
      isOpen: true,
    });
  }, []);

  const hideModal = useCallback(() => {
    setModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const showAlert = useCallback((title: string, message: string, type: ModalType = 'info') => {
    showModal({ title, message, type });
  }, [showModal]);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, options?: { confirmText?: string, cancelText?: string }) => {
    showModal({
      title,
      message,
      type: 'confirm',
      onConfirm: () => {
        onConfirm();
        hideModal();
      },
      ...options
    });
  }, [showModal, hideModal]);

  const showSuccess = useCallback((title: string, message: string) => {
    showAlert(title, message, 'success');
  }, [showAlert]);

  const showError = useCallback((title: string, message: string) => {
    showAlert(title, message, 'error');
  }, [showAlert]);

  const showWarning = useCallback((title: string, message: string) => {
    showAlert(title, message, 'warning');
  }, [showAlert]);

  return {
    modal,
    showModal,
    hideModal,
    showAlert,
    showConfirm,
    showSuccess,
    showError,
    showWarning
  };
};
