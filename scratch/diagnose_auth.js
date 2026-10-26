const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

const sanitizeEnv = (val) => {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '').trim();
};

const url = sanitizeEnv(envConfig.NEXT_PUBLIC_SUPABASE_URL || '');
const rawAnon = sanitizeEnv(envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
const rawPub = sanitizeEnv(envConfig.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '');

const isPlaceholderKey = (key) => {
  if (!key) return true;
  const k = key.trim();
  return (
    !k ||
    k === "placeholder-anon-key" ||
    k.includes("your-anon-key") ||
    k.includes("your-publishable-key") ||
    k === "your-key-here"
  );
};

const isPlaceholderUrl = (url) => {
  if (!url) return true;
  const u = url.trim();
  return (
    !u ||
    u === "https://placeholder.supabase.co" ||
    u.includes("your-project-id") ||
    u.includes("your-project-ref") ||
    u.includes("placeholder.supabase")
  );
};

const isMock = isPlaceholderUrl(url) || isPlaceholderKey(rawPub || rawAnon);

console.log("Diagnostics:");
console.log("- URL present:", Boolean(url));
console.log("- URL is placeholder:", isPlaceholderUrl(url));
console.log("- Pub key present:", Boolean(rawPub));
console.log("- Pub key is placeholder:", isPlaceholderKey(rawPub));
console.log("- Anon key present:", Boolean(rawAnon));
console.log("- Anon key is placeholder:", isPlaceholderKey(rawAnon));
console.log("- Is Mock mode active in client:", isMock);
