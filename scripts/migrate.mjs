// Aplica backend/schema.sql no banco (conexão direta). Uso: npm run db:migrate
import { readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não encontrado (.env.local)");

const sql = await readFile(new URL("../backend/schema.sql", import.meta.url), "utf8");
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(sql);
  const { rows } = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1",
  );
  console.log("Tabelas:", rows.map((r) => r.table_name).join(", "));
} finally {
  await client.end();
}
