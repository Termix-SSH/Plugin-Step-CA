import type { ComponentType } from "react";
import type { TermixApp } from "@termix-ssh/plugin-sdk/frontend";
import { StepCaAuthEditor } from "./StepCaAuthEditor";
import { StepCaOverlay } from "./StepCaOverlay";
import { RedirectUriSetting } from "./RedirectUriSetting";

/** Only hosts that use this auth, or reach it through a jump host, need it. */
function needsSignIn(context: Record<string, unknown>, authType: string) {
  const host = context.host as
    { authType?: string; jumpHosts?: unknown[] } | undefined;
  return host?.authType === authType || (host?.jumpHosts?.length ?? 0) > 0;
}

export function activate(app: TermixApp): void {
  app.registerSshAuthEditor({
    authType: "stepca",
    titleKey: "hosts.filterAuthStepca",
    component: StepCaAuthEditor,
  });

  // The browser sign-in while a terminal connects to a Step CA host.
  app.registerSlotContribution("terminal.overlay", {
    actionId: "step-ca.signIn",
    when: (context) => needsSignIn(context, "stepca"),
    titleKey: "dialog.title",
    kind: "component",
    component: StepCaOverlay as unknown as ComponentType<
      Record<string, unknown>
    >,
  });

  app.registerSettingsComponent("redirectUri", RedirectUriSetting);
}

export function deactivate(): void {
  // Registrations through app are disposed by core.
}
