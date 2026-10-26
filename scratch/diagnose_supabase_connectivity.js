const dns = require("dns");
const https = require("https");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });

async function diagnose() {
  const results = {
    envConfig: {},
    networkResolver: {},
    targetHostnameResolution: {},
    httpsConnectivity: {},
  };

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  results.envConfig.urlConfigured = !!rawUrl;
  results.envConfig.anonKeyConfigured = !!anonKey;
  results.envConfig.anonKeyLength = anonKey ? anonKey.length : 0;
  results.envConfig.anonKeyIsJwt = anonKey ? anonKey.startsWith("eyJ") : false;
  results.envConfig.keySource = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    : (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" : "NONE");
  results.envConfig.serviceRoleKeyConfigured = !!serviceRoleKey;

  if (!rawUrl) {
    results.envConfig.error = "NEXT_PUBLIC_SUPABASE_URL is not defined in .env.local";
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
    results.envConfig.protocol = parsedUrl.protocol;
    results.envConfig.hostname = parsedUrl.hostname;
    results.envConfig.isHttps = parsedUrl.protocol === "https:";
    results.envConfig.isSupabaseCo = parsedUrl.hostname.endsWith(".supabase.co");
    
    // Check project ref pattern: standard Supabase refs are 20 lowercase alphanumeric chars
    const match = parsedUrl.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/);
    results.envConfig.validProjectRefPattern = !!match;
    if (match) {
      results.envConfig.projectRef = match[1];
    }
  } catch (err) {
    results.envConfig.parseError = err.message;
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // Check general Internet DNS resolution
  try {
    const generalDns = await dns.promises.lookup("supabase.com");
    results.networkResolver.supabaseComResolves = true;
    results.networkResolver.supabaseComIp = generalDns.address;
  } catch (err) {
    results.networkResolver.supabaseComResolves = false;
    results.networkResolver.error = err.code || err.message;
  }

  try {
    const googleDns = await dns.promises.lookup("dns.google");
    results.networkResolver.googleDnsResolves = true;
    results.networkResolver.googleDnsIp = googleDns.address;
  } catch (err) {
    results.networkResolver.googleDnsResolves = false;
    results.networkResolver.error = err.code || err.message;
  }

  // Check target hostname resolution (once)
  const targetHost = parsedUrl.hostname;
  try {
    const targetLookup = await dns.promises.lookup(targetHost);
    results.targetHostnameResolution.resolved = true;
    results.targetHostnameResolution.address = targetLookup.address;
  } catch (err) {
    results.targetHostnameResolution.resolved = false;
    results.targetHostnameResolution.errorCode = err.code;
    results.targetHostnameResolution.errorMessage = err.message;
  }

  // Also query authoritative DNS servers directly (e.g., 8.8.8.8, 1.1.1.1) to eliminate local DNS caching or filtering
  try {
    const resolver = new dns.promises.Resolver();
    resolver.setServers(["8.8.8.8", "1.1.1.1"]);
    const publicDnsLookup = await resolver.resolve4(targetHost);
    results.targetHostnameResolution.publicDnsResolved = true;
    results.targetHostnameResolution.publicDnsAddresses = publicDnsLookup;
  } catch (err) {
    results.targetHostnameResolution.publicDnsResolved = false;
    results.targetHostnameResolution.publicDnsErrorCode = err.code;
    results.targetHostnameResolution.publicDnsErrorMessage = err.message;
  }

  // Only attempt HTTPS connectivity if DNS resolved
  if (results.targetHostnameResolution.resolved || results.targetHostnameResolution.publicDnsResolved) {
    try {
      const response = await new Promise((resolve, reject) => {
        const req = https.get(
          `${rawUrl}/rest/v1/`,
          {
            timeout: 5000,
            headers: {
              apikey: anonKey || "",
              Authorization: `Bearer ${anonKey || ""}`,
            },
          },
          (res) => {
            resolve({ statusCode: res.statusCode, headers: res.headers });
          }
        );
        req.on("error", reject);
        req.on("timeout", () => {
          req.destroy();
          reject(new Error("ETIMEDOUT"));
        });
      });
      results.httpsConnectivity.attempted = true;
      results.httpsConnectivity.statusCode = response.statusCode;
    } catch (err) {
      results.httpsConnectivity.attempted = true;
      results.httpsConnectivity.error = err.message;
    }
  } else {
    results.httpsConnectivity.attempted = false;
    results.httpsConnectivity.reason = "Skipped because hostname could not be resolved by local and public DNS resolvers.";
  }

  console.log(JSON.stringify(results, null, 2));
}

diagnose();
