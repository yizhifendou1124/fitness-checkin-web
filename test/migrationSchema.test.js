const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const schemaSql = fs.readFileSync(
    path.join(__dirname, "..", "supabase", "schema.sql"),
    "utf8"
);

test("schema exposes a safe email-to-email checkin migration function", () => {
    assert.match(schemaSql, /create or replace function public\.copy_checkins_between_emails\(\s*source_email text,\s*target_email text,\s*migration_mode text default 'incremental'/);
    assert.match(schemaSql, /security definer/);
    assert.match(schemaSql, /lower\(trim\(target_email\)\) <> 'zxw@fitness\.com'/);
    assert.match(schemaSql, /target_user_id <> auth\.uid\(\)/);
    assert.match(schemaSql, /source_user_id = target_user_id/);
    assert.match(schemaSql, /migration_mode not in \('incremental', 'overwrite'\)/);
    assert.match(schemaSql, /if migration_mode = 'overwrite' then/);
    assert.match(schemaSql, /delete from public\.checkins/);
    assert.match(schemaSql, /on conflict \(user_id, date\) do nothing/);
    assert.match(schemaSql, /grant execute on function public\.copy_checkins_between_emails\(text, text, text\) to authenticated/);
});
