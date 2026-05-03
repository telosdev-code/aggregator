import type { Request, Response, NextFunction } from "express";
import { log } from "./logger.js";
import { Sentry } from "../lib/sentry.js";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  if (statusCode >= 500) {
    log.error({ err }, "Unhandled error");
    Sentry.captureException(err);
  }
  res.status(statusCode).json({
    error: statusCode < 500 ? err.message : "Internal server error",
  });
}
