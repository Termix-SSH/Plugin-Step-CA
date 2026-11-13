import type { PluginContext } from "@termix-ssh/plugin-sdk/backend";

export interface CallbackQuery {
  state?: string;
  code?: string;
  error?: string;
  error_description?: string;
}

export interface CallbackResult {
  ok: boolean;
  message: string;
}

const SESSION_TTL_MS = 5 * 60 * 1000;
const RESULT_TTL_MS = 60 * 1000;
const PREFIX = "handoff:";

export type Runtime = ReturnType<typeof createRuntime>;

interface Entry {
  expires: number;
  /** Sealed JSON, absent on a route marker. */
  sealed?: string;
}

/**
 * Hands an identity provider callback to the Termix server that started the
 * sign-in. Servers behind one load balancer share a database, so the
 * handoff goes through ctx.kv. With one server nothing is ever handed off.
 */
export function createRuntime(ctx: PluginContext) {
  const routeKey = (state: string) => `${PREFIX}route:${state}`;
  const commandKey = (state: string) => `${PREFIX}command:${state}`;
  const resultKey = (state: string) => `${PREFIX}result:${state}`;

  function logFailure(operation: string, error: unknown): void {
    ctx.log.warn(
      `Step CA sign-in handoff failed (${operation}): ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  async function read(key: string): Promise<Entry | null> {
    const value = (await ctx.kv.get(key)) as Entry | null;
    if (!value || typeof value !== "object") return null;
    if (typeof value.expires !== "number" || value.expires < Date.now()) {
      await ctx.kv.delete(key);
      return null;
    }
    return value;
  }

  /** Reads and removes a value; only the caller whose delete worked gets it. */
  async function take<T>(key: string): Promise<T | null> {
    const entry = await read(key);
    if (!entry?.sealed) return null;
    if (!(await ctx.kv.delete(key))) return null;
    const plain = await ctx.secrets.unseal(entry.sealed);
    if (!plain) return null;
    try {
      return JSON.parse(plain) as T;
    } catch {
      return null;
    }
  }

  async function put(key: string, value: unknown, ttl: number): Promise<void> {
    await ctx.kv.set(key, {
      expires: Date.now() + ttl,
      sealed: await ctx.secrets.seal(JSON.stringify(value)),
    } satisfies Entry);
  }

  /** Drops handoff entries a crashed server left behind. */
  async function sweep(): Promise<void> {
    const now = Date.now();
    for (const key of await ctx.kv.list()) {
      if (!key.startsWith(PREFIX)) continue;
      const value = (await ctx.kv.get(key)) as Entry | null;
      if (!value || typeof value.expires !== "number" || value.expires < now) {
        await ctx.kv.delete(key);
      }
    }
  }

  return {
    async register(state: string): Promise<void> {
      try {
        await sweep();
        await ctx.kv.set(routeKey(state), {
          expires: Date.now() + SESSION_TTL_MS,
        } satisfies Entry);
      } catch (error) {
        logFailure("register", error);
      }
    },

    /** Queues a callback for the server that owns the sign-in. */
    async submit(state: string, query: CallbackQuery): Promise<boolean> {
      try {
        if (!(await read(routeKey(state)))) return false;
        if (await read(commandKey(state))) return false;
        await put(commandKey(state), query, SESSION_TTL_MS);
        return true;
      } catch (error) {
        logFailure("submit", error);
        return false;
      }
    },

    async takeCommand(state: string): Promise<CallbackQuery | null> {
      try {
        return await take<CallbackQuery>(commandKey(state));
      } catch (error) {
        logFailure("take_command", error);
        return null;
      }
    },

    async complete(state: string, result: CallbackResult): Promise<void> {
      try {
        await put(resultKey(state), result, RESULT_TTL_MS);
        await ctx.kv.delete(routeKey(state));
        await ctx.kv.delete(commandKey(state));
      } catch (error) {
        logFailure("complete", error);
      }
    },

    async takeResult(state: string): Promise<CallbackResult | null> {
      try {
        return await take<CallbackResult>(resultKey(state));
      } catch (error) {
        logFailure("take_result", error);
        return null;
      }
    },

    async remove(state: string): Promise<void> {
      for (const key of [
        routeKey(state),
        commandKey(state),
        resultKey(state),
      ]) {
        await ctx.kv.delete(key).catch((error) => logFailure("remove", error));
      }
    },

    async close(): Promise<void> {
      // Nothing held open.
    },
  };
}
