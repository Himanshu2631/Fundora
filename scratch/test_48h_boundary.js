async function test48HourBoundary() {
  const basePayload = {
    campaign_id: "SYNTHETIC_48H_TEST_001",
    title: "Community Clean Water Filtration Project",
    description: "Providing clean drinking water filters and sanitation education to families in our regional community.",
    goal: 10000.0,
    category: "Community",
    country: "US",
    city: "Denver",
    launch_date: "2026-09-01T00:00:00Z",
    donations: [
      { amount: 100.0, seconds_elapsed: 3600.0 },   // 1 hour
      { amount: 250.0, seconds_elapsed: 21600.0 }   // 6 hours
    ],
    updates: [
      { seconds_elapsed: 86400.0 }                  // 24 hours
    ],
    comments: [
      { seconds_elapsed: 43200.0 }                  // 12 hours
    ],
    has_cover_photo: true,
    num_body_photos: 1
  };

  const payloadWithPost48h = {
    ...basePayload,
    donations: [
      ...basePayload.donations,
      { amount: 5000.0, seconds_elapsed: 200000.0 } // 200,000s (> 48h / 172,800s)
    ],
    updates: [
      ...basePayload.updates,
      { seconds_elapsed: 300000.0 }                 // 300,000s (> 48h)
    ],
    comments: [
      ...basePayload.comments,
      { seconds_elapsed: 250000.0 }                 // 250,000s (> 48h)
    ]
  };

  console.log("=== Running TEST A (Events strictly within 48 hours) ===");
  const resA = await fetch("http://localhost:3000/api/ml/viability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(basePayload)
  });
  const dataA = await resA.json();
  console.log(`Status A: ${resA.status}`);
  console.log(`Risk Probability A: ${dataA.risk_probability}`);
  console.log(`Viability Score A: ${dataA.viability_score}`);
  console.log(`Risk Level A: ${dataA.risk_level}`);

  console.log("\n=== Running TEST B (Same campaign + events after 48 hours: 200k, 250k, 300k seconds) ===");
  const resB = await fetch("http://localhost:3000/api/ml/viability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadWithPost48h)
  });
  const dataB = await resB.json();
  console.log(`Status B: ${resB.status}`);
  console.log(`Risk Probability B: ${dataB.risk_probability}`);
  console.log(`Viability Score B: ${dataB.viability_score}`);
  console.log(`Risk Level B: ${dataB.risk_level}`);

  console.log("\n=== Comparison Analysis ===");
  const probMatch = dataA.risk_probability === dataB.risk_probability;
  const scoreMatch = dataA.viability_score === dataB.viability_score;
  const levelMatch = dataA.risk_level === dataB.risk_level;

  console.log(`Risk Probability Exact Match: ${probMatch} (${dataA.risk_probability} vs ${dataB.risk_probability})`);
  console.log(`Viability Score Exact Match: ${scoreMatch} (${dataA.viability_score} vs ${dataB.viability_score})`);
  console.log(`Risk Level Exact Match: ${levelMatch} (${dataA.risk_level} vs ${dataB.risk_level})`);

  // Compare explanations
  const riskFactorsA = JSON.stringify(dataA.explanation.top_risk_factors);
  const riskFactorsB = JSON.stringify(dataB.explanation.top_risk_factors);
  const factorsMatch = riskFactorsA === riskFactorsB;
  console.log(`SHAP Top Risk Factors Match: ${factorsMatch}`);

  console.log(`\nOverall 48-Hour Invariance: ${probMatch && scoreMatch && levelMatch && factorsMatch ? "CONFIRMED IDENTICAL" : "DIFFERENT"}`);
  console.log(`Full Response JSON Equality: ${JSON.stringify(dataA) === JSON.stringify(dataB)}`);
}

test48HourBoundary().catch(console.error);
