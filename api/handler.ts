import app from "../backend/src/app";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return app.fetch(req);
}

export async function POST(req: Request) {
  return app.fetch(req);
}

export async function PATCH(req: Request) {
  return app.fetch(req);
}

export async function DELETE(req: Request) {
  return app.fetch(req);
}

export async function OPTIONS(req: Request) {
  return app.fetch(req);
}
