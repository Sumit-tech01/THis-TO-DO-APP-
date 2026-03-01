export const notFound = (req, _res, next) => {
  next({ statusCode: 404, message: `Route not found: ${req.originalUrl}` });
};

export const errorHandler = (error, req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const requestId = req.id || null;
  req.log?.error(
    {
      err: error,
      requestId,
      statusCode,
    },
    "Request failed"
  );

  if (error.code === 11000) {
    const duplicateField = Object.keys(error.keyPattern || {})[0] || "resource";
    return res.status(409).json({
      message: `${duplicateField} already exists`,
      requestId,
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation failed",
      details: Object.values(error.errors).map((item) => item.message),
      requestId,
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({ message: "Invalid identifier format", requestId });
  }

  return res.status(statusCode).json({
    message: error.message || "Internal Server Error",
    requestId,
  });
};
