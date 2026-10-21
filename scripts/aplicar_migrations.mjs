// Aplica, em ordem, os arquivos .sql de supabase/migrations/ contra o Postgres do Supabase.
// Uso: DATABASE_URL="postgresql://postgres:<senha>@db.<ref>.supabase.co:5432/postgres" node scripts/aplicar_migrations.mjs
// Não grava a senha em nenhum arquivo — ela só existe na variável de ambiente da chamada.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Defina DATABASE_URL antes de rodar este script.");
  process.exit(1);
}

const dirMigrations = path.join(import.meta.dirname, "..", "supabase", "migrations");
const arquivos = readdirSync(dirMigrations)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  for (const arquivo of arquivos) {
    const sql = readFileSync(path.join(dirMigrations, arquivo), "utf8");
    console.log(`Aplicando ${arquivo}...`);
    await client.query(sql);
    console.log(`OK: ${arquivo}`);
  }
  await client.end();
  console.log("Todas as migrations aplicadas com sucesso.");
}

main().catch(async (erro) => {
  console.error("Falhou:", erro.message);
  await client.end().catch(() => {});
  process.exit(1);
});
