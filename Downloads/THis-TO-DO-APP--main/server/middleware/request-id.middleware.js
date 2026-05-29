import crypto from "node:crypto";

export const requestId = (req, res, next) => {
  const existingId = req.headers["x-request-id"];
  const id =
    typeof existingId === "string" && existingId.trim()
      ? existingId.trim().slice(0, 128)
      : crypto.randomUUID();

  req.id = id;
  res.setHeader("x-request-id", id);

  next();
};

