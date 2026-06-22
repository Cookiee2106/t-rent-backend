function successResponse(res, statusCode, message, data = null, meta = null) {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
}

function errorResponse(res, statusCode, message, details = null) {
  const response = {
    success: false,
    message,
  };

  if (details !== null) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

module.exports = {
  successResponse,
  errorResponse,
};
