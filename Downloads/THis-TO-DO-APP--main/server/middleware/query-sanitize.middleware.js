const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, nested]) => {
      if (key.startsWith("$") || key.includes(".")) {
        return acc;
      }
      acc[key] = sanitizeValue(nested);
      return acc;
    }, {});
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
};

export const sanitizeQuery = (req, _res, next) => {
  req.query = sanitizeValue(req.query);
  next();
};

