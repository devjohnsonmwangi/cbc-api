// src/auth/auth.utils.ts

import jwt from 'jsonwebtoken';

// --- OPTIMIZATION: In-memory token blacklist with automatic cleanup (TTL) ---
// This Map stores tokens and a corresponding setTimeout timer ID.
// This prevents the unbounded memory leak of the original Set.
const blacklistedTokens = new Map<string, NodeJS.Timeout>();

// The refresh token is valid for 7 days. We'll keep it in the blacklist for
// the same duration + 1 hour buffer to be safe.
const MS_IN_ONE_HOUR = 3_600_000;
const REFRESH_TOKEN_TTL_BUFFER = MS_IN_ONE_HOUR; // 1 hour buffer

/**
 * Adds a refresh token to the blacklist. The token will be automatically
 * removed from the blacklist after it would have naturally expired.
 * @param token The refresh token string.
 * @param exp The original 'exp' (expiration time) timestamp from the JWT payload (in seconds).
 */
export function addRefreshTokenToBlacklist(token: string, exp: number) {
  if (blacklistedTokens.has(token)) {
    // If for some reason it's already there, do nothing.
    return;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const expiresInMs = (exp - nowInSeconds) * 1000 + REFRESH_TOKEN_TTL_BUFFER;

  // If the token is already expired, we can add it for a minimal time
  // just in case of race conditions, then remove it.
  if (expiresInMs <= 0) {
    // Clean it up after 5 minutes to be safe.
    const minimalTtl = 5 * 60 * 1000;
    const timer = setTimeout(() => {
        blacklistedTokens.delete(token);
    }, minimalTtl);
    blacklistedTokens.set(token, timer);
    return;
  }

  const timer = setTimeout(() => {
    blacklistedTokens.delete(token);
    // console.log(`[Auth Util] Expired token removed from blacklist.`);
  }, expiresInMs);

  // Store the token and its cleanup timer.
  blacklistedTokens.set(token, timer);
}

/**
 * Checks if a refresh token is in the blacklist.
 * @param token The refresh token string.
 * @returns True if the token is blacklisted, false otherwise.
 */
export async function isRefreshTokenBlacklisted(token: string): Promise<boolean> {
  return blacklistedTokens.has(token);
}


// --- JWT HELPER FUNCTIONS ---

export const generateAccessToken = (userId: number) =>
  jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '15m' });

export const generateRefreshToken = (userId: number) =>
  jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, process.env.JWT_SECRET!);

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET!);