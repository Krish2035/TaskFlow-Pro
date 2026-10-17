import { Request, Response, NextFunction } from "express";

/**
 * XSS Filter: Strips dangerous HTML tags, inline javascript, and malicious event handlers.
 * Allows safe markdown and clean plain text while preventing DOM-based or stored XSS attacks.
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return input;

  return input
    // Strip <script ...>...</script> tags entirely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Strip iframe, embed, object, frame tags
    .replace(/<(iframe|embed|object|frame|frameset|link|meta)\b[^>]*>/gi, "")
    .replace(/<\/(iframe|embed|object|frame|frameset|link|meta)>/gi, "")
    // Strip javascript: / vbscript: pseudo protocols
    .replace(/javascript:[^"'\s]*/gi, "")
    .replace(/vbscript:[^"'\s]*/gi, "")
    // Strip inline event attributes like onerror=, onclick=, onload=
    .replace(/\s*on\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\s*on\w+\s*=\s*[^>\s]+/gi, "")
    // Strip dangerous data URLs
    .replace(/data:text\/html[^"'\s]*/gi, "");
}

/**
 * Recursively sanitizes all string values within an object.
 */
function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== "object") {
    if (typeof obj === "string") {
      return sanitizeString(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    sanitized[key] = sanitizeObject(obj[key]);
  }
  return sanitized;
}

/**
 * Express middleware that sanitizes request body fields to prevent stored XSS attacks.
 */
export function xssSanitizeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  next();
}
