import test from "node:test";
import assert from "node:assert/strict";
import {
  createPasswordResetToken,
  passwordResetCooldownSeconds,
  passwordResetTokenMinutes,
} from "../api/_lib/db.js";

test("password reset settings tolerate malformed values and preserve valid limits", async () => {
  const keys = ["PASSWORD_RESET_TOKEN_MINUTES", "PASSWORD_RESET_COOLDOWN_SECONDS", "DATABASE_URL"];
  const previous = keys.map((key) => process.env[key]);
  const previousPool = globalThis.__eztodoPool;
  try {
    for (const value of [undefined, "", " ", "30 分鐘", "PASSWORD_RESET_TOKEN_MINUTES=30", "NaN", "Infinity", "1e100", "30.5"]) {
      for (const key of keys.slice(0, 2)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      assert.equal(passwordResetTokenMinutes(), 30);
      assert.equal(passwordResetCooldownSeconds(), 120);
    }
    process.env.PASSWORD_RESET_TOKEN_MINUTES = " 60 ";
    process.env.PASSWORD_RESET_COOLDOWN_SECONDS = "180";
    assert.equal(passwordResetTokenMinutes(), 60);
    assert.equal(passwordResetCooldownSeconds(), 180);
    process.env.PASSWORD_RESET_TOKEN_MINUTES = "0";
    process.env.PASSWORD_RESET_COOLDOWN_SECONDS = "-1";
    assert.equal(passwordResetTokenMinutes(), 5);
    assert.equal(passwordResetCooldownSeconds(), 30);

    process.env.PASSWORD_RESET_TOKEN_MINUTES = "30 分鐘";
    process.env.DATABASE_URL = "postgres://localhost/test";
    const startedAt = Date.now();
    let storedHash;
    globalThis.__eztodoPool = {
      async query(sql, params) {
        const [userId, hash, expiresAt] = params;
        assert.equal(userId, "test-user");
        assert.ok(Number.isFinite(expiresAt.getTime()));
        assert.ok(expiresAt.getTime() >= startedAt + 30 * 60 * 1000);
        assert.ok(expiresAt.getTime() <= Date.now() + 30 * 60 * 1000);
        storedHash = hash;
        return { rows: [{ id: userId }] };
      },
    };
    const { token } = await createPasswordResetToken("test-user");
    assert.notEqual(storedHash, token);
    assert.match(storedHash, /^[a-f0-9]{64}$/);
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
    if (previousPool === undefined) delete globalThis.__eztodoPool;
    else globalThis.__eztodoPool = previousPool;
  }
});
