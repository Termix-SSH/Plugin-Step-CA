import { Shield, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "@termix/plugin-sdk/frontend";
import {
  PanePrompt,
  PROMPT_BUTTON,
  PROMPT_PRIMARY_BUTTON,
} from "@termix/plugin-sdk/ui";

export type SignInStage = "chooser" | "waiting" | "authenticating" | "error";

interface StepCaDialogProps {
  stage: SignInStage;
  error?: string;
  onCancel: () => void;
  onOpenUrl: () => void;
  backgroundColor?: string;
}

/** The browser sign-in the terminal shows while Step CA waits. */
export function StepCaDialog({
  stage,
  error,
  onCancel,
  onOpenUrl,
  backgroundColor,
}: StepCaDialogProps) {
  const { t } = useTranslation();

  return (
    <PanePrompt
      open
      layer="connection"
      backgroundColor={backgroundColor}
      icon={<Shield className="size-4" />}
      title={t("dialog.title")}
      description={stage === "chooser" ? t("dialog.description") : undefined}
      className="max-w-md"
      actions={
        <button type="button" onClick={onCancel} className={PROMPT_BUTTON}>
          {stage === "error" ? t("common.close") : t("common.cancel")}
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        {stage === "chooser" && (
          <button
            type="button"
            onClick={onOpenUrl}
            className={`${PROMPT_PRIMARY_BUTTON} w-full`}
          >
            <ExternalLink className="size-3.5" />
            {t("dialog.openBrowser")}
          </button>
        )}

        {(stage === "waiting" || stage === "authenticating") && (
          <div className="flex items-center gap-3 py-1">
            <Loader2 className="size-4 animate-spin text-accent-brand shrink-0" />
            <p className="text-xs text-muted-foreground">
              {stage === "waiting"
                ? t("dialog.waiting")
                : t("dialog.authenticating")}
            </p>
          </div>
        )}

        {stage === "error" && error && (
          <div className="flex items-start gap-3 p-3 border border-destructive/20 bg-destructive/10">
            <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-destructive">
                {t("common.error")}
              </p>
              <p className="text-xs text-destructive/90 mt-1 whitespace-pre-wrap break-words">
                {error}
              </p>
            </div>
          </div>
        )}
      </div>
    </PanePrompt>
  );
}
