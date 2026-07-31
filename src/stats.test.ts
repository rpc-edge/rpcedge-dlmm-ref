import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createStats, totalPaper, statsSnapshot } from "./stats.js";

describe("stats", () => {
  it("totals paper sources", () => {
    const s = createStats();
    s.paper.seed = 1;
    s.paper.account = 2;
    s.paper.logs = 3;
    assert.equal(totalPaper(s), 6);
    assert.equal((statsSnapshot(s).paper as { total: number }).total, 6);
  });
});
