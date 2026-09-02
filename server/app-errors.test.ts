import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import express from "express";
import type { Server } from "node:http";
import {
  AppError,
  AuthenticationError,
  BusinessConflictError,
  ResourceNotFoundError,
  ValidationError,
  correlationIdMiddleware,
  errorHandler,
} from "./app-errors";

let server: Server | undefined;

afterEach(() => new Promise<void>((resolve, reject) => {
  if (!server) return resolve();
  server.close((error) => error ? reject(error) : resolve());
  server = undefined;
}));

test("an unexpected error is generic and does not stop subsequent requests", async () => {
  const app = express();
  app.use(correlationIdMiddleware);
  app.get("/explode", () => {
    throw new Error("secret_token=do-not-disclose user@example.com");
  });
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);

  const logLines: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...values: unknown[]) => logLines.push(values.join(" "));
  try {
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server!.once("listening", resolve));
    const address = server.address();
    assert(address && typeof address === "object");
    const origin = `http://127.0.0.1:${address.port}`;

    const failure = await fetch(`${origin}/explode`);
    assert.equal(failure.status, 500);
    const correlationId = failure.headers.get("x-correlation-id");
    assert(correlationId);
    assert.deepEqual(await failure.json(), {
      error: "Une erreur interne est survenue",
      code: "INTERNAL_ERROR",
      correlationId,
    });

    const followUp = await fetch(`${origin}/health`);
    assert.equal(followUp.status, 200);
    assert.deepEqual(await followUp.json(), { ok: true });

    assert.equal(logLines.length, 1);
    const event = JSON.parse(logLines[0]);
    assert.equal(event.correlationId, correlationId);
    assert.equal(event.errorCode, "INTERNAL_ERROR");
    assert(!logLines[0].includes("do-not-disclose"));
    assert(!logLines[0].includes("user@example.com"));
  } finally {
    console.error = originalConsoleError;
  }
});

test("application error classes expose distinct status and codes", () => {
  const errors: Array<[AppError, number, string]> = [
    [new ValidationError(), 400, "VALIDATION_ERROR"],
    [new AuthenticationError(), 401, "AUTHENTICATION_ERROR"],
    [new ResourceNotFoundError(), 404, "NOT_FOUND"],
    [new BusinessConflictError(), 409, "BUSINESS_CONFLICT"],
  ];
  for (const [error, status, code] of errors) {
    assert.equal(error.statusCode, status);
    assert.equal(error.code, code);
  }
});
