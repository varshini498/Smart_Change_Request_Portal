export const getDisplayRequestNumber = (request) =>
  request?.request_number || request?.requestNumber || request?.id || '-';
