import { toast } from 'react-toastify';

const defaultOptions = {
  containerId: 'app-toast',
  autoClose: 2000,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: false,
  pauseOnFocusLoss: false,
  draggable: false,
};

export const successToast = (msg) => {
  toast.success(msg, defaultOptions);
};

export const errorToast = (msg) => {
  toast.error(msg || 'Something went wrong', defaultOptions);
};

export const infoToast = (msg, options = {}) => {
  toast.info(`ℹ ${msg}`, {
    ...defaultOptions,
    ...options,
  });
};
