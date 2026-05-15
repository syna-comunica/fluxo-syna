import { handle } from "hono/vercel";
import app from "../backend/src/app.ts";

// Executa no runtime Node.js para compatibilidade com mysql2 e bcryptjs.
export const config = {
  runtime: 'nodejs'
}

export default handle(app);
