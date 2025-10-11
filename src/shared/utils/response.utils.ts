export const formatResponse = (data: any) => {
  return { success: true, data };
};

export const handleError = (error: Error) => {
  console.error(error.message);
  return { success: false, message: 'Internal server error' };
};
