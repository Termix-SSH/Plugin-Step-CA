import { describe, expect, it } from "vitest";
import { createMockCtx, createTestDb } from "@termix-ssh/plugin-sdk/testing";
import { createCertStore } from "../../src/backend/cert-store.js";
import { certs } from "../../src/backend/tables.js";
import { manifest, pluginDir } from "./helpers.js";

async function store() {
  const db = await createTestDb(pluginDir);
  db.sqlite.prepare("INSERT OR IGNORE INTO users (id) VALUES (?)").run("u");
  db.sqlite.prepare("INSERT OR IGNORE INTO ssh_data (id) VALUES (?)").run(1);
  const mock = createMockCtx({
    pluginId: manifest.id,
    manifest,
    capabilities: manifest.capabilities,
    db: db.database,
  });
  const table = await mock.ctx.db.define(certs);
  return createCertStore(mock.ctx, table);
}

describe("cert store", () => {
  const later = new Date(Date.now() + 3_600_000);

  it("returns a saved OpenSSH key", async () => {
    const certStore = await store();
    const privateKey = "-----BEGIN OPENSSH PRIVATE KEY-----\nx\n";
    await certStore.save("u", 1, { sshCert: "cert", privateKey }, later);
    expect(await certStore.get("u", 1)).toEqual({
      sshCert: "cert",
      privateKey,
    });
  });

  it("drops a key ssh2 cannot read so the user signs in again", async () => {
    const certStore = await store();
    const privateKey = "-----BEGIN PRIVATE KEY-----\nx\n";
    await certStore.save("u", 1, { sshCert: "cert", privateKey }, later);
    expect(await certStore.get("u", 1)).toBeNull();
  });
});
