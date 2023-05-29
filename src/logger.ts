import pino from "pino";
import { pinoHttp } from "pino-http";

import { PINO_LOG_LEVEL } from "./config";

export const logger = pino({ name: "blog-server" });
export const httpLogger = pinoHttp({ logger, level: PINO_LOG_LEVEL });