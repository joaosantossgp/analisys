"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowUpCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  bridgeApplyUpdate,
  bridgeCheckUpdate,
  isDesktopMode,
} from "@/lib/desktop-bridge";

const SNOOZE_KEY = "update-prompt-snooze-until";

function isSnoozed(): boolean {
  try {
    const val = localStorage.getItem(SNOOZE_KEY);
    if (!val) return false;
    return Date.now() < Number(val);
  } catch {
    return false;
  }
}

function snooze7Days(): void {
  try {
    localStorage.setItem(
      SNOOZE_KEY,
      String(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );
  } catch {
    // ignore storage errors
  }
}

type ModalState = "closed" | "available" | "updating" | "error";

export function UpdatePrompt() {
  const [modalState, setModalState] = useState<ModalState>("closed");
  const [version, setVersion] = useState("");

  useEffect(() => {
    if (!isDesktopMode()) return;
    if (isSnoozed()) return;

    bridgeCheckUpdate()
      .then((result) => {
        if (result.available) {
          setVersion(result.version);
          setModalState("available");
        }
      })
      .catch(() => {
        // silent — update check failure must not disrupt the user
      });
  }, []);

  async function handleUpdate() {
    setModalState("updating");
    try {
      await bridgeApplyUpdate();
      // app will restart; if we somehow return, close modal
      setModalState("closed");
    } catch {
      setModalState("error");
    }
  }

  function handleSnooze() {
    snooze7Days();
    setModalState("closed");
  }

  if (modalState === "closed") return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md rounded-[1.35rem] border-border/70 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {modalState === "error" ? (
              <AlertCircle className="size-5 text-destructive" />
            ) : (
              <ArrowUpCircle className="size-5 text-primary" />
            )}
            {modalState === "error"
              ? "Falha na atualização"
              : "Nova versão disponível"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(modalState === "available") && (
            <>
              <p className="text-sm text-muted-foreground">
                A versão{" "}
                <strong className="text-foreground">{version}</strong> está
                disponível. Deseja atualizar agora?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={handleSnooze}>
                  Lembrar depois
                </Button>
                <Button size="sm" onClick={handleUpdate}>
                  Atualizar agora
                </Button>
              </div>
            </>
          )}
          {modalState === "updating" && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Baixando e instalando atualização…
            </div>
          )}
          {modalState === "error" && (
            <>
              <p className="text-sm text-destructive">
                Não foi possível aplicar a atualização. Tente novamente mais
                tarde.
              </p>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setModalState("closed")}
                >
                  Fechar
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
