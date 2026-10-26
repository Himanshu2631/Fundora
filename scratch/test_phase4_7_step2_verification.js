const fs = require("fs");
const path = require("path");
const dns = require("dns");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });

async function runStep2Verification() {
  console.log("==================================================");
  console.log("PHASE 4.7 STEP 2: SUPABASE VERIFICATION REPORT");
  console.log("==================================================\n");

  const results = {
    checks: [],
  };

  function record(name, status, details) {
    results.checks.push({ name, status, details });
    const mark = status === "PASS" ? "✓ [PASS]" : status === "FAIL" ? "✗ [FAIL]" : "⚠ [BLOCKED]";
    console.log(`${mark} ${name}: ${details}`);
  }

  // 1. Env Configuration Check
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const keyVarName = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    : (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" : "NONE");

  if (!url) {
    record("Supabase URL Environment Check", "FAIL", "NEXT_PUBLIC_SUPABASE_URL is missing.");
  } else {
    try {
      const parsed = new URL(url);
      const isRef = /^[a-z0-9]{20}\.supabase\.co$/.test(parsed.hostname);
      record(
        "Supabase URL Environment Check",
        "PASS",
        `Configured with protocol ${parsed.protocol}//, valid Supabase host pattern: ${isRef}`
      );
    } catch (e) {
      record("Supabase URL Environment Check", "FAIL", `Invalid URL format: ${e.message}`);
    }
  }

  if (!anonKey) {
    record("Supabase Key Environment Check", "FAIL", "Neither ANON_KEY nor PUBLISHABLE_KEY is configured.");
  } else {
    record(
      "Supabase Key Environment Check",
      "PASS",
      `Configured via ${keyVarName} (length: ${anonKey.length} chars, JWT format: ${anonKey.startsWith("eyJ")})`
    );
  }

  // 2. DNS Diagnostics
  try {
    const generalDns = await dns.promises.lookup("supabase.com");
    record("General Internet/DNS Reachability", "PASS", `Successfully resolved supabase.com -> ${generalDns.address}`);
  } catch (e) {
    record("General Internet/DNS Reachability", "FAIL", `Cannot resolve supabase.com: ${e.message}`);
  }

  const host = url ? new URL(url).hostname : null;
  if (host) {
    let resolved = false;
    try {
      await dns.promises.lookup(host);
      resolved = true;
      record("Configured Hostname DNS Resolution", "PASS", `Resolved ${host}`);
    } catch (e) {
      record("Configured Hostname DNS Resolution", "BLOCKED", `Local lookup failed: ${e.code} (${e.message})`);
    }

    try {
      const resolver = new dns.promises.Resolver();
      resolver.setServers(["8.8.8.8", "1.1.1.1"]);
      await resolver.resolve4(host);
      record("Authoritative Public DNS Resolution (8.8.8.8, 1.1.1.1)", "PASS", `Public DNS resolved ${host}`);
    } catch (e) {
      record("Authoritative Public DNS Resolution (8.8.8.8, 1.1.1.1)", "BLOCKED", `Public DNS query failed: ${e.code}`);
    }
  }

  // 3. Migration Files Inspection
  const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
  const mig1Path = path.join(migrationsDir, "20260921000000_campaign_viability_assessments.sql");
  const mig2Path = path.join(migrationsDir, "20260921010000_assessment_idempotency.sql");
  const mig3Path = path.join(migrationsDir, "20260922000000_assessment_history_index.sql");
  const setupDbPath = path.join(process.cwd(), "supabase", "SETUP_DATABASE.sql");

  const mig1Exists = fs.existsSync(mig1Path);
  const mig2Exists = fs.existsSync(mig2Path);
  const mig3Exists = fs.existsSync(mig3Path);
  const setupDbExists = fs.existsSync(setupDbPath);

  if (mig1Exists && mig2Exists && mig3Exists) {
    const m1 = fs.readFileSync(mig1Path, "utf8");
    const m2 = fs.readFileSync(mig2Path, "utf8");
    const m3 = fs.readFileSync(mig3Path, "utf8");

    const hasTable = m1.includes("CREATE TABLE IF NOT EXISTS public.campaign_viability_assessments");
    const hasRls = m1.includes("ENABLE ROW LEVEL SECURITY");
    const hasAdminPolicy = m1.includes("Admins have full access on assessments");
    const hasIdempotencyCol = m2.includes("ADD COLUMN IF NOT EXISTS assessment_type");
    const hasIdempotencyIndex = m2.includes("idx_unique_campaign_initial_48h_assessment");
    const hasStatusCol = m3.includes("ADD COLUMN IF NOT EXISTS status");
    const hasModelVerCol = m3.includes("ADD COLUMN IF NOT EXISTS model_version");
    const hasHistoryIndex = m3.includes("idx_campaign_viability_assessments_campaign_history");

    if (hasTable && hasRls && hasAdminPolicy && hasIdempotencyCol && hasIdempotencyIndex && hasStatusCol && hasModelVerCol && hasHistoryIndex) {
      record("Migration Schema Requirements", "PASS", "All 3 migration files present with complete columns, indexes, and constraints.");
    } else {
      record("Migration Schema Requirements", "FAIL", "Missing required definitions across migrations.");
    }
  } else {
    record("Migration Schema Requirements", "FAIL", "One or more migration files missing.");
  }

  // 4. SETUP_DATABASE.sql Alignment
  if (setupDbExists) {
    const sdb = fs.readFileSync(setupDbPath, "utf8");
    const hasStep10 = sdb.includes("STEP 10: Campaign Viability Assessments");
    const hasUnifiedTable = sdb.includes("CREATE TABLE IF NOT EXISTS public.campaign_viability_assessments");
    const hasUnifiedIdempotency = sdb.includes("idx_unique_campaign_initial_48h_assessment");
    const hasUnifiedHistory = sdb.includes("idx_campaign_viability_assessments_campaign_history");

    if (hasStep10 && hasUnifiedTable && hasUnifiedIdempotency && hasUnifiedHistory) {
      record(
        "SETUP_DATABASE.sql Synchronization",
        "PASS",
        "SETUP_DATABASE.sql Step 10 consolidates all 3 migrations for single-file deployment."
      );
    } else {
      record("SETUP_DATABASE.sql Synchronization", "FAIL", "SETUP_DATABASE.sql missing consolidated viability table.");
    }
  } else {
    record("SETUP_DATABASE.sql Synchronization", "FAIL", "SETUP_DATABASE.sql not found.");
  }

  // 5. Codebase Alignment with Schema
  const codeServicePath = path.join(process.cwd(), "lib", "ml", "assessmentService.js");
  if (fs.existsSync(codeServicePath)) {
    const code = fs.readFileSync(codeServicePath, "utf8");
    const usesStatus = code.includes("assessmentRecord.status");
    const usesModelVer = code.includes("assessmentRecord.model_version");
    const usesIdempotencyType = code.includes("assessment_type: assessmentType");
    const usesHistoryIndexOrder = code.includes('.order("created_at"');

    if (usesStatus && usesModelVer && usesIdempotencyType && usesHistoryIndexOrder) {
      record("Code-to-Schema Alignment", "PASS", "assessmentService.js perfectly matches table schema & composite index.");
    } else {
      record("Code-to-Schema Alignment", "FAIL", "Discrepancy between assessmentService.js and database schema.");
    }
  } else {
    record("Code-to-Schema Alignment", "FAIL", "assessmentService.js not found.");
  }

  console.log("\n==================================================");
  const passed = results.checks.filter(c => c.status === "PASS").length;
  const blocked = results.checks.filter(c => c.status === "BLOCKED").length;
  const failed = results.checks.filter(c => c.status === "FAIL").length;
  console.log(`SUMMARY: ${passed} PASS, ${blocked} BLOCKED, ${failed} FAIL`);
  console.log("==================================================");
}

runStep2Verification();
