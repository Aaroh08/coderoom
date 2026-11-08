import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { yCollab } from "y-codemirror.next";
import {
  $,
  Y,
  boot,
  context,
  api,
  notice,
  bindText,
  decode,
  escape,
} from "./shared.js";
boot(() => {
  const { doc, session } = context();
  $("#mode").textContent = "JavaScript · live collaboration";
  $("#content").innerHTML =
    `<div class="columns"><section class="panel"><div class="toolbar"><h2>Solution editor</h2><span class="pill">Shared</span></div><p class="muted">Implement solve(...args). Edits merge across participants every 1.5 seconds.</p><div id="code" class="code-surface"></div><div class="toolbar"><button id="starter">Insert starter</button><button id="run" class="primary">Run test cases →</button></div><p class="muted">JavaScript only. 1-second interpreter budget, 3-second worker deadline. No host APIs.</p></section><section><div class="panel"><h2>Test cases</h2><p class="muted">JSON array of {args: [...], expected: ...}. Compared using JSON serialization.</p><textarea id="cases" aria-label="Test cases" spellcheck="false">[{"args":[[2,7,11,15],9],"expected":[0,1]},{"args":[[3,2,4],6],"expected":[1,2]}]</textarea><pre id="results" role="status">Run your solution to see results.</pre></div><div class="panel"><h2>Interview notes</h2><textarea id="notes" aria-label="Shared interview notes" placeholder="Approach, complexity, edge cases…"></textarea></div></section></div><section class="panel"><div class="toolbar"><h2>Session history</h2><button id="history">Load saved checkpoints</button></div><p class="muted">Last 100 merged snapshots. Preview is read-only; timestamps reflect server saves.</p><select id="revisions" aria-label="Select checkpoint"><option>Select a checkpoint</option></select><pre id="preview">Select a checkpoint to review the code.</pre></section>`;
  const editor = new EditorView({
    doc: doc.getText("code").toString(),
    extensions: [
      basicSetup,
      javascript(),
      oneDark,
      yCollab(doc.getText("code"), null),
      EditorView.contentAttributes.of({ "aria-label": "Shared code editor" }),
      EditorView.theme({
        "&": { minHeight: "380px", fontSize: "14px" },
        ".cm-scroller": { overflow: "auto" },
      }),
    ],
    parent: $("#code"),
  });
  bindText($("#notes"), doc.getText("notes"));
  $("#starter").onclick = () => {
    if (doc.getText("code").length)
      return notice("Starter is available only when the editor is empty.");
    doc
      .getText("code")
      .insert(
        0,
        "function solve(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}",
      );
  };
  $("#run").onclick = async () => {
    const button = $("#run");
    button.disabled = true;
    try {
      const result = await api("/rooms/" + session.id + "/run", {
        code: editor.state.doc.toString(),
        cases: JSON.parse($("#cases").value),
      });
      $("#results").textContent = result.error
        ? "Execution error: " + result.error
        : result.results
            .map(
              (r, i) =>
                `${r.pass ? "PASS" : "FAIL"} · Case ${i + 1}\n${JSON.stringify(r, null, 2)}`,
            )
            .join("\n\n");
    } catch (e) {
      $("#results").textContent = e.message;
    } finally {
      button.disabled = false;
    }
  };
  $("#history").onclick = async () => {
    try {
      const rows = await api("/rooms/" + session.id + "/history");
      $("#revisions").innerHTML =
        '<option value="">Select a checkpoint</option>' +
        rows
          .map(
            (r, i) =>
              `<option value="${i}">Revision ${r.revision} · ${escape(r.created)}</option>`,
          )
          .join("");
      $("#revisions").onchange = () => {
        if ($("#revisions").value === "") return;
        const snapshot = new Y.Doc();
        Y.applyUpdate(
          snapshot,
          decode(rows[Number($("#revisions").value)].state),
        );
        $("#preview").textContent =
          snapshot.getText("code").toString() || "(empty code)";
        snapshot.destroy();
      };
    } catch (e) {
      notice(e.message);
    }
  };
}).catch((e) => notice(e.message));
