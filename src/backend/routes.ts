import type { Request, Response, Router } from "express";
import type { AuthSessions } from "./auth-session.js";
import { sendResultPage } from "./result-page.js";

/**
 * The identity provider redirects here without a Termix session: the sign-in
 * may finish in another browser, so it is matched by the OAuth state.
 */
export const PUBLIC_PATHS = ["/callback"];

export function registerRoutes(router: Router, sessions: AuthSessions): void {
  /**
   * @openapi
   * /plugin-api/step-ca/callback:
   *   get:
   *     summary: OIDC callback for a Step CA sign-in
   *     description: Public. The redirect URI registered with the identity provider behind the CA's OIDC provisioner. Exchanges the code, has the CA sign the key and tells the terminal to reconnect.
   *     tags: [Step CA]
   *     parameters:
   *       - name: state
   *         in: query
   *         schema:
   *           type: string
   *       - name: code
   *         in: query
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Signed in; an HTML page the browser can close.
   *       400:
   *         description: The sign-in failed or is no longer active.
   */
  router.get("/callback", async (req: Request, res: Response) => {
    const query = (name: string): string | undefined => {
      const value = req.query[name];
      return typeof value === "string" ? value : undefined;
    };
    const result = await sessions.complete({
      state: query("state"),
      code: query("code"),
      error: query("error"),
      error_description: query("error_description"),
    });
    sendResultPage(res, result.ok ? 200 : 400, {
      ok: result.ok,
      detail: result.message,
    });
  });
}
