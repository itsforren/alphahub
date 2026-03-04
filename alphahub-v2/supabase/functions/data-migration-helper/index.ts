import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OLD_DB_URL = "postgres://postgres:jqE8fCdonbY3SYnHRgfAgsME_wrU_wrN@db.qydkrpirrfelgtcqasdx.supabase.co:5432/postgres";
const MIGRATION_SECRET = "bridge-migration-2024";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-migration-secret",
};

function respond(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = req.headers.get("x-migration-secret");
    if (secret !== MIGRATION_SECRET) return respond({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { action, table, offset, limit: rowLimit } = body;

    const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.5/mod.js");

    if (action === "test_connection") {
      const oldDb = postgres(OLD_DB_URL, { max: 1, idle_timeout: 10, connect_timeout: 15 });
      const result = await oldDb`SELECT count(*) as cnt FROM clients`;
      await oldDb.end();
      return respond({ success: true, result: result[0] });
    }

    if (action === "list_tables") {
      const oldDb = postgres(OLD_DB_URL, { max: 1, idle_timeout: 10, connect_timeout: 30 });
      const tables = await oldDb`
        SELECT tablename as table_name FROM pg_tables
        WHERE schemaname = 'public' ORDER BY tablename`;
      const results = [];
      for (const t of tables) {
        try {
          const cr = await oldDb`SELECT count(*)::int as row_count FROM ${oldDb(t.table_name)}`;
          results.push({ table_name: t.table_name, row_count: cr[0].row_count });
        } catch (e: any) {
          results.push({ table_name: t.table_name, row_count: -1, error: e.message });
        }
      }
      await oldDb.end();
      return respond({ tables: results.filter(r => r.row_count > 0) });
    }

    if (action === "copy_table") {
      if (!table) return respond({ error: "table parameter required" }, 400);

      const oldDb = postgres(OLD_DB_URL, { max: 1, idle_timeout: 10, connect_timeout: 120 });
      const newDbUrl = Deno.env.get("SUPABASE_DB_URL") || "";
      if (!newDbUrl) { await oldDb.end(); return respond({ error: "SUPABASE_DB_URL not set" }, 500); }
      const newDb = postgres(newDbUrl, { max: 1, idle_timeout: 10, connect_timeout: 120 });

      const batchOffset = offset || 0;
      const batchLimit = rowLimit || 5000;
      const errors: string[] = [];

      // Disable triggers and FK constraints on the new DB connection
      await newDb.unsafe(`SET session_replication_role = 'replica'`);

      // Get column names and types from new DB (target)
      const newColInfo = await newDb.unsafe(
        `SELECT column_name, data_type, udt_name, is_generated, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table]
      );

      // Skip generated columns
      const generatedCols = new Set(
        newColInfo.filter((c: any) => c.is_generated === 'ALWAYS' || c.is_generated === 'YES')
          .map((c: any) => c.column_name)
      );

      // Get column names from old DB
      const oldColInfo = await oldDb.unsafe(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table]
      );

      // Use only columns that exist in BOTH old and new, excluding generated
      const newColNames = new Set(newColInfo.map((c: any) => c.column_name));
      const columns = oldColInfo
        .map((c: any) => c.column_name)
        .filter((c: string) => newColNames.has(c) && !generatedCols.has(c));

      // Build select list that casts everything to text to avoid serialization issues
      const selectCols = columns.map((c: string) => `"${c}"::text as "${c}"`).join(', ');

      // Read rows from old DB, all as text
      const rows = await oldDb.unsafe(
        `SELECT ${selectCols} FROM "${table}" ORDER BY ctid OFFSET $1 LIMIT $2`,
        [batchOffset, batchLimit]
      );

      if (rows.length === 0) {
        await oldDb.end();
        await newDb.end();
        return respond({ success: true, rows_copied: 0 });
      }

      // Insert row by row using text values and letting PG cast them
      let copied = 0;
      const colList = columns.map((c: string) => `"${c}"`).join(', ');

      for (const row of rows) {
        const values = columns.map((c: string) => row[c]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

        try {
          await newDb.unsafe(
            `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`,
            values
          );
          copied++;
        } catch (e: any) {
          if (errors.length < 10) {
            errors.push(`Row error: ${e.message.substring(0, 200)}`);
          }
        }
      }

      await oldDb.end();
      await newDb.end();
      return respond({
        success: true,
        rows_copied: copied,
        rows_attempted: rows.length,
        errors: errors.length > 0 ? errors : undefined,
        error_count: rows.length - copied,
      });
    }

    // Copy leads that exist in old DB but not in new DB (by id)
    if (action === "sync_missing_leads") {
      const oldDb = postgres(OLD_DB_URL, { max: 1, idle_timeout: 10, connect_timeout: 30 });
      const newDbUrl = Deno.env.get("SUPABASE_DB_URL") || "";
      if (!newDbUrl) { await oldDb.end(); return respond({ error: "SUPABASE_DB_URL not set" }, 500); }
      const newDb = postgres(newDbUrl, { max: 1, idle_timeout: 10, connect_timeout: 30 });

      // Get all lead IDs from new DB
      const newIds = await newDb.unsafe(`SELECT id FROM leads`);
      const newIdSet = new Set(newIds.map((r: any) => r.id));

      // Get all leads from old DB that are NOT in new DB
      const oldLeads = await oldDb.unsafe(
        `SELECT id::text, lead_id, agent_id, first_name, last_name, email, phone, state,
                lead_date::text, lead_source, status, delivery_status, delivery_error,
                ghl_contact_id, delivered_at::text, delivery_attempts,
                last_delivery_attempt_at::text, webhook_payload::text, lead_data::text,
                age, employment, interest, savings, investments, timezone,
                utm_source, utm_medium, utm_campaign, utm_content, utm_term,
                gclid, fbclid, notes, created_at::text, updated_at::text
         FROM leads
         ORDER BY created_at DESC`
      );

      const missingLeads = oldLeads.filter((r: any) => !newIdSet.has(r.id));

      if (missingLeads.length === 0) {
        await oldDb.end();
        await newDb.end();
        return respond({ success: true, missing: 0, copied: 0 });
      }

      await newDb.unsafe(`SET session_replication_role = 'replica'`);
      let copied = 0;
      const errors: string[] = [];

      for (const row of missingLeads) {
        try {
          await newDb.unsafe(
            `INSERT INTO leads (id, lead_id, agent_id, first_name, last_name, email, phone, state,
              lead_date, lead_source, status, delivery_status, delivery_error,
              ghl_contact_id, delivered_at, delivery_attempts,
              last_delivery_attempt_at, webhook_payload, lead_data,
              age, employment, interest, savings, investments, timezone,
              utm_source, utm_medium, utm_campaign, utm_content, utm_term,
              gclid, fbclid, notes, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19::jsonb,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35)
             ON CONFLICT (id) DO NOTHING`,
            [row.id, row.lead_id, row.agent_id, row.first_name, row.last_name, row.email,
             row.phone, row.state, row.lead_date, row.lead_source, row.status,
             row.delivery_status, row.delivery_error, row.ghl_contact_id, row.delivered_at,
             row.delivery_attempts, row.last_delivery_attempt_at, row.webhook_payload || '{}',
             row.lead_data || '{}', row.age, row.employment, row.interest, row.savings,
             row.investments, row.timezone, row.utm_source, row.utm_medium, row.utm_campaign,
             row.utm_content, row.utm_term, row.gclid, row.fbclid, row.notes,
             row.created_at, row.updated_at]
          );
          copied++;
        } catch (e: any) {
          errors.push(`${row.id}: ${e.message.substring(0, 100)}`);
        }
      }

      await oldDb.end();
      await newDb.end();
      return respond({
        success: true,
        missing: missingLeads.length,
        copied,
        error_count: missingLeads.length - copied,
        errors: errors.slice(0, 10),
        leads: missingLeads.map((r: any) => ({ id: r.id, agent_id: r.agent_id, name: `${r.first_name} ${r.last_name}`, created_at: r.created_at, delivery_status: r.delivery_status })),
      });
    }

    return respond({ error: "Unknown action. Use: test_connection, list_tables, copy_table, sync_missing_leads" }, 400);
  } catch (e: any) {
    return respond({ error: e.message, stack: e.stack?.substring(0, 500) }, 500);
  }
});
