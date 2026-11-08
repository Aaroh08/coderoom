import { fork } from "node:child_process";
export function execute(code, cases) {
  return new Promise((resolve) => {
    const child = fork(new URL("./sandbox.mjs", import.meta.url), [], {
      stdio: ["ignore", "ignore", "ignore", "ipc"],
      execArgv: ["--max-old-space-size=96"],
      env: {},
    });
    let done = false;
    const end = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.kill();
      resolve(result);
    };
    const timer = setTimeout(
      () =>
        end({ error: "Execution exceeded the 3 second deadline", results: [] }),
      3000,
    );
    child.on("message", end);
    child.on("error", () =>
      end({ error: "Execution worker unavailable", results: [] }),
    );
    child.on("exit", () =>
      end({ error: "Execution worker stopped", results: [] }),
    );
    child.send({ code, cases });
  });
}
