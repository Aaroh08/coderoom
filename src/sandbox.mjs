import { getQuickJS } from "quickjs-emscripten";
process.once("message", async ({ code, cases }) => {
  let runtime, vm;
  try {
    const QuickJS = await getQuickJS();
    runtime = QuickJS.newRuntime();
    runtime.setMemoryLimit(16 * 1024 * 1024);
    runtime.setMaxStackSize(256 * 1024);
    const deadline = Date.now() + 1000;
    runtime.setInterruptHandler(() => Date.now() > deadline);
    vm = runtime.newContext();
    // No host functions, networking, filesystem, process or module loader are exposed.
    const source =
      code +
      "\n;JSON.stringify(" +
      JSON.stringify(cases) +
      ".map(t=>{try {const actual=solve(...t.args);return {actual,expected:t.expected,pass:JSON.stringify(actual)===JSON.stringify(t.expected)}}catch(e){return {pass:false,error:String(e)}}}));";
    const result = vm.evalCode(source);
    if (result.error) {
      const e = vm.dump(result.error);
      result.error.dispose();
      process.send({
        error: String(e.message || e).slice(0, 1000),
        results: [],
      });
    } else {
      const value = vm.getString(result.value);
      result.value.dispose();
      process.send(
        value.length > 50000
          ? { error: "Output limit exceeded", results: [] }
          : { results: JSON.parse(value) },
      );
    }
  } catch (e) {
    process.send({
      error: "Execution failed: " + String(e.message).slice(0, 200),
      results: [],
    });
  } finally {
    vm?.dispose();
    runtime?.dispose();
    process.disconnect();
  }
});
