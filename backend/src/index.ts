import "dotenv/config";
import { randomUUID } from "crypto";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { query, queryOne, execute, closePool } from "./db.ts";
import {
  extractToken,
  verifyToken,
  getUserById,
  generateToken,
  loginUser,
  registerUser,
} from "./auth.ts";

type Variables = {
  userId: string;
};

const app = new Hono();
const api = new Hono<{ Variables: Variables }>();

const categoryInsert = z.object({
  name: z.string().min(1),
  type: z.enum(["income", "expense"]),
  color: z.string().min(1),
});

const transactionInsert = z.object({
  description: z.string().min(1),
  amount: z.number().nonnegative(),
  type: z.enum(["income", "expense"]),
  status: z.enum(["paid", "pending"]),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category_id: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  paid_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().optional(),
});

const transactionPatch = z
  .object({
    status: z.enum(["paid", "pending"]).optional(),
    paid_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    description: z.string().min(1).optional(),
    amount: z.number().nonnegative().optional(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    category_id: z
      .union([z.string().uuid(), z.literal(""), z.null()])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v === null ? null : v)),
    type: z.enum(["income", "expense"]).optional(),
    notes: z.string().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: "empty patch" });

const budgetUpsert = z.object({
  category_id: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  planned_amount: z.number().nonnegative(),
});

function mapTx(t: Record<string, unknown>) {
  return { ...t, amount: Number(t.amount) };
}

function mapBudget(b: Record<string, unknown>) {
  return { ...b, planned_amount: Number(b.planned_amount) };
}

// Public auth endpoints (no authentication required)
const authRouter = new Hono();

authRouter.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = z
      .object({
        email: z.string().email(),
        password: z.string().min(1),
      })
      .safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const result = await loginUser(parsed.data.email, parsed.data.password);
    if (!result) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    return c.json(result, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

authRouter.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = z
      .object({
        email: z.string().email(),
        password: z.string().min(8, "Password must be at least 8 characters"),
        agency_name: z.string().optional(),
      })
      .safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const result = await registerUser(
      parsed.data.email,
      parsed.data.password,
      parsed.data.agency_name
    );

    if (!result) {
      return c.json({ error: "Email already registered or registration failed" }, 409);
    }

    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

api.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") {
    return next();
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return c.json({ error: "Server misconfigured: JWT_SECRET not set" }, 500);
  }

  const authHeader = c.req.header("Authorization");
  const token = extractToken(authHeader);
  
  if (!token) {
    return c.json({ error: "Missing Authorization: Bearer <token>" }, 401);
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const user = await getUserById(decoded.userId);
  if (!user) {
    return c.json({ error: "User not found or inactive" }, 401);
  }

  c.set("userId", user.id);
  return next();
});

// User profile endpoint
api.get("/auth/me", async (c) => {
  const userId = c.get("userId");
  try {
    const user = await getUserById(userId);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const [userData] = await query<any>(
      `SELECT id, email, agency_name, created_at, last_login FROM users WHERE id = ?`,
      [userId]
    );

    return c.json(userData[0] || null);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

api.get("/categories", async (c) => {
  const userId = c.get("userId");
  try {
    const [data] = await query<any>(
      `SELECT id, name, type, color, created_at FROM categories 
       WHERE user_id = ? ORDER BY name`,
      [userId]
    );
    return c.json(data ?? []);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

api.post("/categories", async (c) => {
  const parsed = categoryInsert.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const userId = c.get("userId");
  try {
    const newId = randomUUID();
    await execute(
      `INSERT INTO categories (id, user_id, name, type, color) VALUES (?, ?, ?, ?, ?)`,
      [newId, userId, parsed.data.name, parsed.data.type, parsed.data.color]
    );

    const data = await queryOne<any>(
      `SELECT id, user_id, name, type, color, created_at FROM categories WHERE id = ?`,
      [newId]
    );

    return c.json(data, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

api.delete("/categories/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  try {
    await execute(`DELETE FROM categories WHERE id = ? AND user_id = ?`, [id, userId]);
    return c.body(null, 204);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

api.get("/transactions", async (c) => {
  const userId = c.get("userId");
  try {
    const [data] = await query<any>(
      `SELECT id, user_id, category_id, description, amount, type, status, 
              due_date, paid_date, notes, created_at, updated_at 
       FROM transactions WHERE user_id = ? 
       ORDER BY due_date DESC`,
      [userId]
    );
    return c.json(
      (data ?? []).map((t: any) => ({
        ...t,
        amount: Number(t.amount),
      }))
    );
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

api.post("/transactions", async (c) => {
  const parsed = transactionInsert.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const userId = c.get("userId");
  const body = parsed.data;
  
  const paid_date =
    body.paid_date !== undefined
      ? body.paid_date
      : body.status === "paid"
        ? body.due_date
        : null;

  try {
    const newId = randomUUID();
    await execute(
      `INSERT INTO transactions (id, user_id, category_id, description, amount, type, status, due_date, paid_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        userId,
        body.category_id ?? null,
        body.description,
        body.amount,
        body.type,
        body.status,
        body.due_date,
        paid_date,
        body.notes ?? null,
      ]
    );

    const data = await queryOne<any>(
      `SELECT id, user_id, category_id, description, amount, type, status, due_date, paid_date, notes, created_at, updated_at
       FROM transactions WHERE id = ?`,
      [newId]
    );

    return c.json(
      data
        ? { ...data, amount: Number(data.amount) }
        : null,
      201
    );
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

api.patch("/transactions/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const parsed = transactionPatch.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const patch = { ...parsed.data };
  const setClauses = Object.keys(patch)
    .map((key) => `${key} = ?`)
    .join(", ");
  const values = Object.values(patch);

  try {
    await execute(`UPDATE transactions SET ${setClauses} WHERE id = ? AND user_id = ?`, [
      ...values,
      id,
      userId,
    ]);

    const data = await queryOne<any>(
      `SELECT id, user_id, category_id, description, amount, type, status, due_date, paid_date, notes, created_at, updated_at 
       FROM transactions WHERE id = ?`,
      [id]
    );

    return c.json(
      data
        ? { ...data, amount: Number(data.amount) }
        : null
    );
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

api.delete("/transactions/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  try {
    await execute(`DELETE FROM transactions WHERE id = ? AND user_id = ?`, [id, userId]);
    return c.body(null, 204);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

api.get("/budgets", async (c) => {
  const month = c.req.query("month");
  const parsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(month);
  if (!parsed.success) return c.json({ error: "Query month=YYYY-MM-DD required" }, 400);
  const userId = c.get("userId");
  
  try {
    const [data] = await query<any>(
      `SELECT id, user_id, category_id, month, planned_amount, created_at 
       FROM budgets WHERE user_id = ? AND month = ?`,
      [userId, parsed.data]
    );
    return c.json(
      (data ?? []).map((b: any) => ({
        ...b,
        planned_amount: Number(b.planned_amount),
      }))
    );
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

api.post("/budgets", async (c) => {
  const parsed = budgetUpsert.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const userId = c.get("userId");
  const row = parsed.data;

  try {
    await execute(
      `INSERT INTO budgets (id, user_id, category_id, month, planned_amount) 
       VALUES (UUID(), ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE planned_amount = ?`,
      [userId, row.category_id, row.month, row.planned_amount, row.planned_amount]
    );

    const data = await queryOne<any>(
      `SELECT id, user_id, category_id, month, planned_amount, created_at 
       FROM budgets WHERE user_id = ? AND category_id = ? AND month = ?`,
      [userId, row.category_id, row.month]
    );

    return c.json(
      data
        ? { ...data, planned_amount: Number(data.planned_amount) }
        : null,
      201
    );
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get("/health", (c) => c.json({ ok: true }));

const origins =
  process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()).filter(Boolean) ??
  ["*"];

app.use(
  "/api/*",
  cors({
    origin: origins.includes("*") ? "*" : origins,
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })
);

// Mount auth router (public endpoints)
app.route("/api/auth", authRouter);

// Mount API router (protected endpoints)
app.route("/api", api);

const port = Number(process.env.PORT) || 8787;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(
    `Finance API http://localhost:${info.port} (health: /health, routes under /api)`
  );
});

process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await closePool();
  process.exit(0);
});
