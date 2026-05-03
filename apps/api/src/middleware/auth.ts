import { clerkMiddleware, getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "./error-handler.js";
import { prisma } from "@aggregator/db";

export const clerkAuth = clerkMiddleware();

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    next(new AppError(401, "Unauthorized"));
    return;
  }
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    next(new AppError(401, "User not found"));
    return;
  }
  (req as Request & { user: typeof user }).user = user;
  next();
}

// For internal worker-to-api calls
export function requireInternalSecret(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const secret = req.headers["x-internal-secret"];
  if (secret !== process.env.INTERNAL_API_SECRET) {
    next(new AppError(403, "Forbidden"));
    return;
  }
  next();
}
