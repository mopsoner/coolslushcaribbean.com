import type { NextFunction, Request, RequestHandler, Response } from "express";
import { randomUUID } from "crypto";

export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "NOT_FOUND"
  | "BUSINESS_CONFLICT"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    public readonly statusCode: number,
    public readonly publicMessage: string,
    options?: ErrorOptions,
  ) {
    super(publicMessage, options);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Données invalides", options?: ErrorOptions) {
    super("VALIDATION_ERROR", 400, message, options);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentification requise", options?: ErrorOptions) {
    super("AUTHENTICATION_ERROR", 401, message, options);
  }
}

export class ResourceNotFoundError extends AppError {
  constructor(message = "Ressource introuvable", options?: ErrorOptions) {
    super("NOT_FOUND", 404, message, options);
  }
}

export class BusinessConflictError extends AppError {
  constructor(message = "Conflit métier", options?: ErrorOptions) {
    super("BUSINESS_CONFLICT", 409, message, options);
  }
}

export class InternalError extends AppError {
  constructor(options?: ErrorOptions) {
    super("INTERNAL_ERROR", 500, "Une erreur interne est survenue", options);
  }
}

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

export const correlationIdMiddleware: RequestHandler = (_req, res, next) => {
  const correlationId = randomUUID();
  _req.correlationId = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);
  next();
};

function logServerError(req: Request, error: unknown, statusCode: number): void {
  // Deliberately exclude request data, headers, error messages and stacks: all can
  // contain credentials or personal data. The correlation ID permits investigation
  // using trusted telemetry without leaking those values into this application log.
  const event = {
    event: "request_error",
    correlationId: req.correlationId,
    statusCode,
    errorCode: error instanceof AppError ? error.code : "INTERNAL_ERROR",
    errorType: error instanceof Error ? error.name : "UnknownError",
  };
  console.error(JSON.stringify(event));
}

export function sendErrorResponse(req: Request, res: Response, error: unknown): Response {
  const appError = error instanceof AppError ? error : new InternalError();
  logServerError(req, error, appError.statusCode);
  return res.status(appError.statusCode).json({
    error: appError.publicMessage,
    code: appError.code,
    correlationId: req.correlationId,
  });
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  sendErrorResponse(req, res, error);
  // The response is complete. Do not rethrow: Express can continue serving requests.
  return;
}
