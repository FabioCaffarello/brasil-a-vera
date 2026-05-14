import { sql } from 'drizzle-orm'

import { db } from './db'

// TRUNCATE de todas as tabelas dos 4 schemas bounded-context (ADR-013).
// CASCADE garante limpeza de FKs em tabelas filhas; RESTART IDENTITY
// reseta sequences (não usadas hoje — UUIDs por ADR-010 — mas custo zero).
//
// Estratégia preferida sobre transaction+rollback pelo motivo do plan:
// imune a queries que abrem subtransactions internas e robusto com
// `db.execute(sql\`...\`)` (caso de getTop5Afinidade).
export async function truncateAll(): Promise<void> {
  await db.execute(sql`
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname IN (
          'parlamentares',
          'votacoes',
          'proposicoes',
          'gastos'
        )
      LOOP
        EXECUTE format(
          'TRUNCATE TABLE %I.%I RESTART IDENTITY CASCADE',
          r.schemaname,
          r.tablename
        );
      END LOOP;
    END $$;
  `)
}
