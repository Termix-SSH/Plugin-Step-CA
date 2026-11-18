import { describe, expect, it, vi } from "vitest";
import type { PluginContext } from "@termix-ssh/plugin-sdk/backend";
import { createRuntime } from "../../src/backend/runtime.js";

/** Two servers behind one load balancer: separate processes, one database. */
function shared() {
  const store = new Map<string, unknown>();
  const kv = {
    get: async (key: string) => (store.has(key) ? store.get(key) : null),
    set: async (key: string, value: unknown) => {
      store.set(key, structuredClone(value));
    },
    delete: async (key: string) => store.delete(key),
    list: async () => [...store.keys()],
  };
  const server = () =>
    createRuntime({
      kv,
      secrets: {
        seal: async (plain: string) => `sealed:${plain}`,
        unseal: async (sealed: string) =>
          sealed.startsWith("sealed:") ? sealed.slice(7) : null,
      },
      log: { warn: vi.fn() },
    } as unknown as PluginContext);
  return { store, a: server(), b: server() };
}

describe("sign-in handoff", () => {
  it("hands a callback to the server that started the sign-in", async () => {
    const { a, b, store } = shared();
    await a.register("s1");
    expect(await b.submit("s1", { state: "s1", code: "abc" })).toBe(true);
    expect(await b.submit("s1", { state: "s1", code: "again" })).toBe(false);
    expect(
      [...store.values()].some((v) => JSON.stringify(v).includes("abc")),
    ).toBe(true);

    expect(await a.takeCommand("s1")).toEqual({ state: "s1", code: "abc" });
    expect(await a.takeCommand("s1")).toBeNull();

    await a.complete("s1", { ok: true, message: "done" });
    expect(await b.takeResult("s1")).toEqual({ ok: true, message: "done" });
    expect(await b.takeResult("s1")).toBeNull();
  });

  it("refuses a callback nobody is waiting for", async () => {
    const { b } = shared();
    expect(await b.submit("unknown", { state: "unknown" })).toBe(false);
  });

  it("drops expired entries", async () => {
    const { a, b, store } = shared();
    await a.register("old");
    vi.useFakeTimers();
    try {
      vi.setSystemTime(Date.now() + 6 * 60 * 1000);
      expect(await b.submit("old", { state: "old" })).toBe(false);
      await a.register("new");
      expect([...store.keys()]).toEqual(["handoff:route:new"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("cleans up everything for a state", async () => {
    const { a, b, store } = shared();
    await a.register("s2");
    await b.submit("s2", { state: "s2" });
    await a.remove("s2");
    expect(store.size).toBe(0);
  });
});
