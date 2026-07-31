import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  loadConfig,
  DEFAULT_WATCH_POOL,
  DLMM_PROGRAM_ID,
} from "./config.js";

describe("loadConfig", () => {
  const prev = { ...process.env };

  function restore() {
    for (const k of Object.keys(process.env)) {
      if (!(k in prev)) delete process.env[k];
    }
    Object.assign(process.env, prev);
  }

  it("defaults to paper + demo pool", () => {
    delete process.env.WATCH_POOL;
    delete process.env.MODE;
    delete process.env.LIVE_SUBMIT;
    delete process.env.WATCH_ACCOUNTS;
    const cfg = loadConfig();
    assert.equal(cfg.watchPool, DEFAULT_WATCH_POOL);
    assert.equal(cfg.mode, "paper");
    assert.equal(cfg.liveSubmit, false);
    assert.equal(cfg.dlmmProgram, DLMM_PROGRAM_ID);
    assert.deepEqual(cfg.watchAccounts, []);
    restore();
  });

  it("parses WATCH_ACCOUNTS", () => {
    process.env.WATCH_ACCOUNTS = `${DEFAULT_WATCH_POOL}, ${DEFAULT_WATCH_POOL}`;
    const cfg = loadConfig();
    assert.equal(cfg.watchAccounts.length, 2);
    restore();
  });

  it("rejects invalid WATCH_POOL", () => {
    process.env.WATCH_POOL = "not-valid!!!";
    assert.throws(() => loadConfig(), /invalid/);
    restore();
  });
});
