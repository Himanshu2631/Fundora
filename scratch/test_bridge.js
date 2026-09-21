async function testBridge() {
  const payload = {
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

  console.log("Sending POST request to http://localhost:3000/api/ml/viability...");
  const startTime = Date.now();
  const response = await fetch("http://localhost:3000/api/ml/viability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const durationMs = Date.now() - startTime;
  console.log(`HTTP Status: ${response.status} ${response.statusText} (${durationMs}ms)`);

  const json = await response.json();
  console.log("Response Body:\n", JSON.stringify(json, null, 2));
}

testBridge().catch(console.error);
