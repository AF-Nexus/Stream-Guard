import jwt from "jsonwebtoken";

const SECRET = process.env.STREAM_SECRET || process.env.SESSION_SECRET || "dev-stream-secret-change-me";

export interface StreamTokenPayload {
  cid: string; // channel id
  uid: string; // user id
}

export function signStreamToken(payload: StreamTokenPayload, ttlSeconds = 60 * 60): string {
  return jwt.sign(payload, SECRET, { expiresIn: ttlSeconds });
}

export function verifyStreamToken(token: string): StreamTokenPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET) as StreamTokenPayload;
    return decoded;
  } catch {
    return null;
  }
}
