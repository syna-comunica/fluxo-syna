import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { query, execute } from "./db.ts";

export interface AuthUser {
  id: string;
  email: string;
}

export function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");

  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: string } | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");

  try {
    const decoded = jwt.verify(token, secret) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  const user = await query<AuthUser>(
    `SELECT id, email FROM users WHERE id = ? AND is_active = TRUE`,
    [userId]
  );
  const [rows] = user;
  return rows[0] || null;
}

export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// User management
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  agency_name?: string;
}

export async function loginUser(email: string, password: string): Promise<{ user: AuthUser; token: string } | null> {
  const [rows] = await query<any>(
    `SELECT id, email, password_hash, is_active FROM users WHERE email = ?`,
    [email]
  );

  const user = rows[0];
  if (!user || !user.is_active) return null;

  const passwordMatch = await comparePassword(password, user.password_hash);
  if (!passwordMatch) return null;

  // Update last login
  await execute(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);

  const token = generateToken(user.id);
  return {
    user: { id: user.id, email: user.email },
    token,
  };
}

export async function registerUser(
  email: string,
  password: string,
  agency_name?: string
): Promise<{ user: AuthUser; token: string } | null> {
  // Check if user already exists
  const [existing] = await query<any>(
    `SELECT id FROM users WHERE email = ?`,
    [email]
  );

  if (existing.length > 0) {
    return null; // User already exists
  }

  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();

  try {
    await execute(
      `INSERT INTO users (id, email, password_hash, agency_name, is_active) 
       VALUES (?, ?, ?, ?, TRUE)`,
      [userId, email, passwordHash, agency_name || "Minha Agência"]
    );

    // Create default categories for new user
    const defaultCategories = [
      { name: "Serviços", type: "income", color: "#16a34a" },
      { name: "Retainer", type: "income", color: "#0ea5e9" },
      { name: "Tráfego Pago", type: "expense", color: "#ef4444" },
      { name: "Folha", type: "expense", color: "#f59e0b" },
      { name: "Software/SaaS", type: "expense", color: "#8b5cf6" },
      { name: "Operacional", type: "expense", color: "#64748b" },
    ];

    for (const cat of defaultCategories) {
      await execute(
        `INSERT INTO categories (id, user_id, name, type, color) 
         VALUES (UUID(), ?, ?, ?, ?)`,
        [userId, cat.name, cat.type, cat.color]
      );
    }

    const token = generateToken(userId);
    return {
      user: { id: userId, email },
      token,
    };
  } catch (error) {
    return null;
  }
}
