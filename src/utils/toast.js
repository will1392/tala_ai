/**
 * Toast utility wrapper
 * 
 * Provides consistent toast notifications
 */

import toast from 'react-hot-toast';

export const showToast = {
  success: (message, options = {}) => {
    return toast.success(message, {
      duration: 4000,
      ...options
    });
  },

  error: (message, options = {}) => {
    return toast.error(message, {
      duration: 5000,
      ...options
    });
  },

  info: (message, options = {}) => {
    return toast(message, {
      duration: 4000,
      icon: 'ℹ️',
      ...options
    });
  },

  loading: (message, options = {}) => {
    return toast.loading(message, options);
  },

  promise: (promise, messages, options = {}) => {
    return toast.promise(promise, messages, options);
  },

  dismiss: (toastId) => {
    return toast.dismiss(toastId);
  }
};