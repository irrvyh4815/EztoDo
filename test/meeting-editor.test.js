import test from "node:test";
import assert from "node:assert/strict";
import { resizeMeetingTextarea } from "../src/meetingEditor.js";

test("meeting textareas grow with pasted text, shrink after deletion, and include borders", () => {
  const original = globalThis.getComputedStyle;
  try {
    globalThis.getComputedStyle = () => ({ minHeight: "240px", borderTopWidth: "1px", borderBottomWidth: "1px" });
    let contentHeight = 1200;
    const element = { style: { height: "240px" }, get scrollHeight() {
      assert.equal(this.style.height, "auto", "clear old height before measuring to support shrinking");
      return contentHeight;
    } };
    resizeMeetingTextarea(element);
    assert.equal(element.style.height, "1202px");
    contentHeight = 82;
    resizeMeetingTextarea(element);
    assert.equal(element.style.height, "240px");
    contentHeight = 3600; // wrapping after narrowing the viewport
    resizeMeetingTextarea(element);
    assert.equal(element.style.height, "3602px");
    assert.doesNotThrow(() => resizeMeetingTextarea(null));
  } finally { if (original === undefined) delete globalThis.getComputedStyle; else globalThis.getComputedStyle = original; }
});
