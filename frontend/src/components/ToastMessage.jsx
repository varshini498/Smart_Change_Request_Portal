import { useEffect } from 'react';

export default function ToastMessage({ message, type = 'success', onClose }) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => onClose?.(), 2400);
    return () => clearTimeout(id);
  }, [message, onClose]);

  if (!message) return null;

  return <div className={`toast ${type}`}>{message}</div>;
}
