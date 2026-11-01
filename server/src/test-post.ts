// server/src/test-post.ts
async function run() {
  const payload = {
    text: "Kavya Menon | Bengaluru, Karnataka | Full-stack web developer with 2 years of experience. Skills: React, Node.js, Express, MongoDB, TypeScript. Experience: Associate Software Engineer at TechCloud Solutions (2024 - Present). Built REST APIs and dashboard components. Education: BCA from Bangalore University in 2023.",
  };

  try {
    const res = await fetch("http://localhost:5000/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("Response status:", res.status);
    console.log("Response data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

run();