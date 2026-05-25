import axios from 'axios';

export const buildError = (error: unknown, service: string): Error => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const details = error.response?.data;
    console.error(`${service} Error [${status}]:`, JSON.stringify(details, null, 2));
    return new Error(
      `${service} Error (status: ${status}): ${details?.error_description || error.message}`,
    );
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
};

export const formatPhoneNumber = (phone?: string): string | undefined => {
  if (!phone?.trim()) return undefined;
  return '+' + phone.replace(/\D/g, '').replace(/^8/, '7');
};
