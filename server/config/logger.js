const formatPayload = (level, message, meta = {}) =>
  JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...meta,
  });

const write = (method, level, message, meta) => {
  const output = formatPayload(level, message, meta);
  method(output);
};

export const logger = {
  info(metaOrMessage, messageMaybe) {
    if (typeof metaOrMessage === "string") {
      write(console.log, "info", metaOrMessage);
      return;
    }
    write(console.log, "info", messageMaybe || "info", metaOrMessage || {});
  },
  warn(metaOrMessage, messageMaybe) {
    if (typeof metaOrMessage === "string") {
      write(console.warn, "warn", metaOrMessage);
      return;
    }
    write(console.warn, "warn", messageMaybe || "warn", metaOrMessage || {});
  },
  error(metaOrMessage, messageMaybe) {
    if (typeof metaOrMessage === "string") {
      write(console.error, "error", metaOrMessage);
      return;
    }
    write(console.error, "error", messageMaybe || "error", metaOrMessage || {});
  },
  debug(metaOrMessage, messageMaybe) {
    if (typeof metaOrMessage === "string") {
      write(console.debug, "debug", metaOrMessage);
      return;
    }
    write(console.debug, "debug", messageMaybe || "debug", metaOrMessage || {});
  },
};

