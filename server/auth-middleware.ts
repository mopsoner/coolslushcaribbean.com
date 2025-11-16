import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// Simple session store in memory (will be lost on server restart)
const sessions = new Map<string, { admin: boolean; createdAt: number }>();

// Session timeout: 24 hours
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

// Admin password from environment
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// Generate a random session token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Clean up expired sessions
function cleanupSessions() {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TIMEOUT) {
      sessions.delete(token);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupSessions, 60 * 60 * 1000);

// Middleware to check if user is authenticated as admin
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  
  if (!token) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  const session = sessions.get(token);
  
  if (!session || !session.admin) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  // Check if session is expired
  if (Date.now() - session.createdAt > SESSION_TIMEOUT) {
    sessions.delete(token);
    return res.status(401).json({ error: "Session expirée" });
  }

  next();
}

// Login function
export function login(password: string): string | null {
  if (password === ADMIN_PASSWORD) {
    const token = generateSessionToken();
    sessions.set(token, {
      admin: true,
      createdAt: Date.now(),
    });
    return token;
  }
  return null;
}

// Logout function
export function logout(token: string): boolean {
  return sessions.delete(token);
}

// Check if a token is valid
export function validateToken(token: string): boolean {
  const session = sessions.get(token);
  if (!session) return false;
  
  // Check if expired
  if (Date.now() - session.createdAt > SESSION_TIMEOUT) {
    sessions.delete(token);
    return false;
  }
  
  return session.admin;
}
