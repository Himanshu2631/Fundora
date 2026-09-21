async function runFailureTests() {
  const validPayload = {
    campaign_id: "SYNTHETIC_TEST_001",
    title: "Community Solar Initiative for Local School",
    description: "We are raising funds to install rooftop solar panels for our local primary school to reduce electricity costs and teach renewable energy science.",
    goal: 15000.0,
    category: "Education",
    country: "US",
    city: "Austin",
    launch_date: "2026-09-01T08:00:00Z",
    donations: [
      { amount: 150.0, seconds_elapsed: 3600.0 },
      { amount: 300.0, seconds_elapsed: 18000.0 },
      { amount: 500.0, seconds_elapsed: 45000.0 },
      { amount: 250.0, seconds_elapsed: 90000.0 }
    ],
    updates: [
      { seconds_elapsed: 10000.0 },
      { seconds_elapsed: 70000.0 }
    ],
    comments: [
      { seconds_elapsed: 5000.0 },
      { seconds_elapsed: 25000.0 }
    ],
    has_cover_photo: true,
    num_body_photos: 2
  };

  const mode = process.argv[2] || "test1";

  if (mode === "test1") {
    console.log("--- TEST 1: FastAPI Unavailable ---");
    const res = await fetch("http://localhost:3000/api/ml/viability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload)
    });
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log(`Response JSON:`, JSON.stringify(data));
  } else if (mode === "test2") {
    console.log("--- TEST 2: Intentionally Invalid Request ---");
    // Invalid payload: negative goal and missing title/category
    const invalidPayload = {
      campaign_id: "INVALID_TEST_001",
      goal: -500.0,
      description: "Short"
    };
    const res = await fetch("http://localhost:3000/api/ml/viability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidPayload)
    });
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log(`Response JSON:`, JSON.stringify(data));
  } else if (mode === "test3") {
    console.log("--- TEST 3: Valid Request ---");
    const res = await fetch("http://localhost:3000/api/ml/viability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload)
    });
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log(`Viability Score: ${data.viability_score}, Risk: ${data.risk_level}`);
  } else if (mode === "app_check") {
    console.log("--- Existing App Check ---");
    const res = await fetch("http://localhost:3000/");
    console.log(`Home Page Status: ${res.status}`);
  }
}

runFailureTests().catch(console.error);
