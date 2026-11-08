import { listen } from "./runtime.mjs";
import { createApp, finish } from "./core.mjs";
import { execute } from "./executor.mjs";
export function application(options) {
  const service = createApp(options);
  const { app } = service;
  let running = 0;
  app.post("/api/rooms/:id/run", async (req, res) => {
    const { code, cases } = req.body;
    if (
      typeof code !== "string" ||
      code.length > 20000 ||
      !Array.isArray(cases) ||
      cases.length < 1 ||
      cases.length > 20 ||
      JSON.stringify(cases).length > 20000 ||
      cases.some(
        (t) => !t || !Array.isArray(t.args) || !Object.hasOwn(t, "expected"),
      )
    )
      return res.status(400).json({
        error:
          "Provide JavaScript (max 20k characters) and 1–20 JSON cases with args and expected",
      });
    if (running >= 2)
      return res
        .status(429)
        .json({ error: "Both execution slots are busy; retry shortly" });
    running++;
    try {
      res.json(await execute(code, cases));
    } finally {
      running--;
    }
  });
  finish(service);
  return service;
}
if (process.argv[1]?.endsWith("server.mjs")) {
  const s = application();
  listen(s);
}
