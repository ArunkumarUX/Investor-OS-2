// Local product worker. Keep this running alongside the app for public-source checks.
const base = process.env.INVEST_OS_URL || "http://localhost:3333";
const target = new URL(base);
if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname))
  throw new Error("The local worker only supports loopback URLs.");
let running = true;
process.on("SIGINT", () => {
  running = false;
});
process.on("SIGTERM", () => {
  running = false;
});
console.log(
  "INVEST OS public-source monitor started. Checks every five minutes.",
);
while (running) {
  try {
    const response = await fetch(`${base}/api/watch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check", worker: true }),
      signal: AbortSignal.timeout(240000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    console.log(
      `${new Date().toISOString()} · ${data.checked} topics checked · ${data.added} new alerts`,
    );
  } catch (error) {
    console.error(`Monitor check failed: ${error.message}`);
  }
  for (let i = 0; running && i < 300; i++)
    await new Promise((resolve) => setTimeout(resolve, 1000));
}
