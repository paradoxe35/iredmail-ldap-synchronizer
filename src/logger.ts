import { createLogger, format, transports } from "winston";
import send_mail from "./notifications";

const logLevels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

export const Logger = createLogger({
  levels: logLevels,
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

Logger.on("error", (err) => {
  err.message = `${err.message} ${err.stack}`;
  send_mail({ subject: "Logger Error", message: err.message });
});
