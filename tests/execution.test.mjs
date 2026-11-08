import test from "node:test";
import assert from "node:assert/strict";
import { execute } from "../src/executor.mjs";
import { harness } from "./harness.mjs";
test("runs real solutions and reports incorrect cases", async () => {
  const r = await execute("function solve(a,b){return a+b}", [
    { args: [2, 3], expected: 5 },
    { args: [1, 1], expected: 7 },
  ]);
  assert.equal(r.results[0].pass, true);
  assert.equal(r.results[1].pass, false);
});
test("host APIs are absent", async () => {
  const r = await execute(
    "function solve(){return [typeof process,typeof require,typeof fetch]}",
    [{ args: [], expected: ["undefined", "undefined", "undefined"] }],
  );
  assert.equal(r.results[0].pass, true);
});
test("infinite code is interrupted and later execution still succeeds", async () => {
  const start = Date.now();
  const r = await execute("while(true){}", [{ args: [], expected: 0 }]);
  assert.ok(r.error);
  assert.ok(Date.now() - start < 5000);
  const next = await execute("function solve(){return 3}", [
    { args: [], expected: 3 },
  ]);
  assert.equal(next.results[0].pass, true);
});
test("syntax errors return structured errors", async () => {
  assert.ok((await execute("function {", [{ args: [], expected: 0 }])).error);
});
test("run route requires authorization and validates case structure", () =>
  harness(async (call) => {
    const { body: r } = await call("/rooms", { name: "Run" });
    assert.equal(
      (await call("/rooms/" + r.id + "/run", { code: "", cases: [] })).status,
      404,
    );
    assert.equal(
      (
        await call(
          "/rooms/" + r.id + "/run",
          { code: "", cases: [{}] },
          r.token,
        )
      ).status,
      400,
    );
    const result = await call(
      "/rooms/" + r.id + "/run",
      {
        code: "function solve(x){return x*2}",
        cases: [{ args: [4], expected: 8 }],
      },
      r.token,
    );
    assert.equal(result.body.results[0].pass, true);
  }));
