"use client";

import {
  AlertTriangleIcon,
  BarChart3Icon,
  Building2Icon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleStopIcon,
  Clock3Icon,
  CloudOffIcon,
  DownloadIcon,
  FileClockIcon,
  FilterIcon,
  HistoryIcon,
  LockIcon,
  PlayIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  TerminalSquareIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  cancelBatchJob,
  fetchBatchJobStatus,
  fetchBatchRefresh,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type AppState =
  | "idle"
  | "confirming"
  | "running"
  | "completed"
  | "source_unavailable"
  | "no_permission"
  | "already_running";

type UpdateType = "full" | "missing" | "outdated" | "failed";
type LogType = "info" | "success" | "warning" | "error" | "dim";

type LogLine = {
  time: string;
  message: string;
  type: LogType;
};

type HistoryItem = {
  date: string;
  type: UpdateType;
  trigger: string;
  status: "success" | "partial" | "failed" | "cancelled";
  duration: string;
  processed: number;
  failures: number;
};

type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

const HISTORY: HistoryItem[] = [];

const REFRESH_STAGES = [
  "planning",
  "download_extract",
  "process_data",
  "persist_reports",
  "finalizing",
] as const;

const UPDATE_TYPE_META: Record<
  UpdateType,
  { label: string; shortLabel: string; description: string; affected: number; duration: string; icon: LucideIcon }
> = {
  full: {
    label: "Atualizacao completa",
    shortLabel: "Completa",
    description: "Todas as 449 empresas",
    affected: 449,
    duration: "~1h 20m",
    icon: RefreshCwIcon,
  },
  missing: {
    label: "Empresas faltantes",
    shortLabel: "Faltantes",
    description: "31 sem dados locais",
    affected: 31,
    duration: "~8m",
    icon: Building2Icon,
  },
  outdated: {
    label: "Dados desatualizados",
    shortLabel: "Desatualizadas",
    description: "87 acima do limiar",
    affected: 87,
    duration: "~22m",
    icon: FileClockIcon,
  },
  failed: {
    label: "Reprocessar falhas",
    shortLabel: "Com falha",
    description: "12 com erro anterior",
    affected: 12,
    duration: "~4m",
    icon: RotateCcwIcon,
  },
};

const SECTORS = [
  "Todos os setores",
  "Petroleo e Gas",
  "Mineracao",
  "Financeiro",
  "Energia Eletrica",
  "Varejo",
  "Telecomunicacoes",
];

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "missing", label: "Sem dados" },
  { value: "outdated", label: "Desatualizado" },
  { value: "failed", label: "Com falha" },
  { value: "active", label: "Ativo" },
];

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

function nowAsLogTime() {
  const now = new Date();
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground", className)}>
      {children}
    </p>
  );
}

function StatusBadge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "error" | "neutral" | "running";
  children: React.ReactNode;
}) {
  const styles = {
    success: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    warning: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    error: "border-destructive/25 bg-destructive/10 text-destructive",
    neutral: "border-border/70 bg-muted/45 text-muted-foreground",
    running: "border-primary/25 bg-primary/10 text-primary",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em]", styles[tone])}>
      {children}
    </span>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <Icon className="size-4.5 text-primary" strokeWidth={1.8} />
      <h2 className="font-heading text-lg font-semibold tracking-[-0.01em]">{title}</h2>
    </div>
  );
}

function SourceHealth({ status }: { status: "available" | "partial" | "offline" }) {
  const map = {
    available: {
      icon: CheckCircle2Icon,
      label: "Disponivel",
      className: "text-emerald-300",
    },
    partial: {
      icon: AlertTriangleIcon,
      label: "Parcial",
      className: "text-amber-300",
    },
    offline: {
      icon: CloudOffIcon,
      label: "Offline",
      className: "text-destructive",
    },
  };
  const item = map[status];
  const Icon = item.icon;

  return (
    <div className={cn("flex items-center gap-1.5 text-sm font-medium", item.className)}>
      <Icon className="size-4" strokeWidth={1.8} />
      {item.label}
    </div>
  );
}

function StatTile({
  label,
  value,
  subvalue,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  subvalue?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-emerald-300",
    warning: "text-amber-300",
  };

  return (
    <Card className="rounded-[1.1rem] bg-card/92 shadow-[0_18px_50px_-42px_rgba(16,30,24,0.35)]">
      <CardContent className="space-y-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <Eyebrow>{label}</Eyebrow>
          <Icon className={cn("size-4", toneClass[tone])} strokeWidth={1.8} />
        </div>
        <div className={cn("font-heading text-3xl font-semibold tabular-nums tracking-[-0.03em]", toneClass[tone])}>
          {value}
        </div>
        {subvalue ? <p className="text-xs text-muted-foreground">{subvalue}</p> : null}
      </CardContent>
    </Card>
  );
}

function AdminSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-[0.75rem] border border-border/70 bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary/60 focus:ring-3 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((option) => {
          const item = typeof option === "string" ? { value: option, label: option } : option;
          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function AdminInput({
  label,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-[0.75rem] border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary/60 focus:ring-3 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
}

function LogEntry({ line }: { line: LogLine }) {
  const colors: Record<LogType, string> = {
    info: "text-sky-300",
    success: "text-emerald-300",
    warning: "text-amber-300",
    error: "text-destructive",
    dim: "text-muted-foreground",
  };

  return (
    <div className="grid grid-cols-[4rem_1fr] gap-3 py-0.5 font-mono text-xs leading-5">
      <span className="text-muted-foreground">{line.time}</span>
      <span className={colors[line.type]}>{line.message}</span>
    </div>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const tone = {
    success: "success",
    partial: "warning",
    failed: "error",
    cancelled: "neutral",
  } as const;

  return (
    <div className="grid min-w-[760px] grid-cols-[160px_115px_110px_90px_110px_75px_36px] items-center gap-3 border-b border-border/45 px-5 py-3 last:border-b-0">
      <span className="font-mono text-xs text-foreground/86">{item.date}</span>
      <span className="text-sm text-muted-foreground">{UPDATE_TYPE_META[item.type].shortLabel}</span>
      <StatusBadge tone={tone[item.status]}>
        {item.status === "partial" ? "Parcial" : item.status === "failed" ? "Falhou" : item.status === "cancelled" ? "Cancelada" : "Sucesso"}
      </StatusBadge>
      <span className="font-mono text-xs text-muted-foreground">{item.duration}</span>
      <span className="font-mono text-xs text-foreground">{formatNumber(item.processed)}</span>
      <span className={cn("font-mono text-xs", item.failures > 0 ? "text-destructive" : "text-muted-foreground")}>
        {item.failures}
      </span>
      <Button variant="ghost" size="icon-sm" aria-label="Abrir detalhes do historico">
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  );
}

function ConfirmationDialog({
  updateType,
  filters,
  onCancel,
  onConfirm,
}: {
  updateType: UpdateType;
  filters: string[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const meta = UPDATE_TYPE_META[updateType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg rounded-[1.35rem] border-border/70 bg-card shadow-[0_30px_90px_-40px_rgba(0,0,0,0.6)]">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Eyebrow className="mb-2">Confirmacao obrigatoria</Eyebrow>
              <CardTitle className="text-xl">Iniciar atualizacao em massa?</CardTitle>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Fechar confirmacao">
              <XIcon className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 px-5">
          <div className="rounded-[1rem] border border-amber-400/20 bg-amber-400/8 p-4 text-sm leading-6 text-amber-100/90">
            Esta operacao pode reprocessar muitas companhias e deve ser usada apenas para
            manutencao da base. Para uma empresa individual, use o fluxo on-demand da pagina da companhia.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[0.95rem] border border-border/60 bg-background/70 p-4">
              <Eyebrow>Tipo</Eyebrow>
              <p className="mt-2 font-medium">{meta.label}</p>
            </div>
            <div className="rounded-[0.95rem] border border-border/60 bg-background/70 p-4">
              <Eyebrow>Impacto estimado</Eyebrow>
              <p className="mt-2 font-mono font-medium">{formatNumber(meta.affected)} empresas</p>
            </div>
            <div className="rounded-[0.95rem] border border-border/60 bg-background/70 p-4">
              <Eyebrow>Duracao prevista</Eyebrow>
              <p className="mt-2 font-mono font-medium">{meta.duration}</p>
            </div>
            <div className="rounded-[0.95rem] border border-border/60 bg-background/70 p-4">
              <Eyebrow>Filtros</Eyebrow>
              <p className="mt-2 text-sm text-muted-foreground">
                {filters.length ? `${filters.length} ativo(s)` : "Nenhum"}
              </p>
            </div>
          </div>
          {filters.length ? (
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <span key={filter} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                  {filter}
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button onClick={onConfirm}>
              <PlayIcon className="size-4" />
              Iniciar agora
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function UpdateBasePage() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [updateType, setUpdateType] = useState<UpdateType>("full");
  const [filterSector, setFilterSector] = useState("Todos os setores");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCvmFrom, setFilterCvmFrom] = useState("");
  const [filterCvmTo, setFilterCvmTo] = useState("");
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [currentCompany, setCurrentCompany] = useState("");
  const [currentStep, setCurrentStep] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [activeSection, setActiveSection] = useState("status");
  const [jobId, setJobId] = useState<string | null>(null);
  const [totalFromJob, setTotalFromJob] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const lastLogCountRef = useRef(0);

  const isRunning = appState === "running" || appState === "already_running";
  const isCompleted = appState === "completed";
  const canRun = appState === "idle";
  const total = totalFromJob || UPDATE_TYPE_META[updateType].affected;

  const activeFilters = useMemo(() => {
    const filters: string[] = [];
    if (filterSector !== "Todos os setores") filters.push(`Setor: ${filterSector}`);
    if (filterStatus !== "all") {
      filters.push(`Status: ${STATUS_OPTIONS.find((item) => item.value === filterStatus)?.label ?? filterStatus}`);
    }
    if (filterCvmFrom) filters.push(`CVM >= ${filterCvmFrom}`);
    if (filterCvmTo) filters.push(`CVM <= ${filterCvmTo}`);
    return filters;
  }, [filterCvmFrom, filterCvmTo, filterSector, filterStatus]);

  const navItems: NavItem[] = useMemo(
    () => [
      { id: "status", label: "Estado da base", icon: BarChart3Icon },
      { id: "controls", label: "Controles", icon: SlidersHorizontalIcon },
      ...(isRunning || isCompleted ? [{ id: "progress", label: "Progresso", icon: Clock3Icon }] : []),
      ...(isCompleted ? [{ id: "results", label: "Resultados", icon: CheckCircle2Icon }] : []),
      { id: "history", label: "Historico", icon: HistoryIcon },
    ],
    [isCompleted, isRunning],
  );

  function addLog(message: string, type: LogType = "info") {
    setLogs((current) => [...current, { time: nowAsLogTime(), message, type }].slice(-100));
  }

  function clearTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  async function handleConfirm() {
    clearTimer();
    lastLogCountRef.current = 0;
    setAppState("running");
    setProgress(0);
    setProcessed(0);
    setSuccessCount(0);
    setFailCount(0);
    setElapsed(0);
    setCurrentCompany("");
    setCurrentStep("");
    setLogs([]);
    setJobId(null);
    setTotalFromJob(0);

    addLog("Iniciando atualizacao em lote...", "info");
    addLog(`Tipo: ${UPDATE_TYPE_META[updateType].shortLabel}`, "dim");

    let dispatch: Awaited<ReturnType<typeof fetchBatchRefresh>>;
    try {
      dispatch = await fetchBatchRefresh({
        mode: updateType,
        sector: filterSector !== "Todos os setores" ? filterSector : null,
        statusFilter: filterStatus !== "all" ? filterStatus : null,
        cvmFrom: filterCvmFrom ? parseInt(filterCvmFrom, 10) : null,
        cvmTo: filterCvmTo ? parseInt(filterCvmTo, 10) : null,
      });
    } catch {
      setAppState("source_unavailable");
      addLog("Falha ao conectar ao servico de atualizacao.", "error");
      return;
    }

    if (dispatch.status === "already_running") {
      setAppState("already_running");
      addLog("Ja existe uma atualizacao em andamento.", "warning");
      if (dispatch.job_id) {
        setJobId(dispatch.job_id);
        startPolling(dispatch.job_id);
      }
      return;
    }

    if (dispatch.status === "already_current") {
      setAppState("completed");
      addLog(dispatch.message, "success");
      return;
    }

    if (dispatch.status === "error") {
      setAppState("source_unavailable");
      addLog(dispatch.message ?? "Erro ao iniciar atualizacao.", "error");
      return;
    }

    const jid = dispatch.job_id ?? "";
    const queuedCount = dispatch.queued ?? UPDATE_TYPE_META[updateType].affected;
    setJobId(jid);
    setTotalFromJob(queuedCount);
    addLog(`Job ${jid.slice(0, 8)} enfileirado (${queuedCount} empresas).`, "dim");
    startPolling(jid);
  }

  function startPolling(jid: string) {
    const startedAt = Date.now();
    intervalRef.current = setInterval(() => {
      void (async () => {
        let status: Awaited<ReturnType<typeof fetchBatchJobStatus>>;
        try {
          status = await fetchBatchJobStatus(jid);
        } catch {
          return;
        }

        const queued = status.queued || 1;
        const pct = Math.min(Math.round((status.processed / queued) * 100), 99);

        setProcessed(status.processed);
        setProgress(pct);
        setFailCount(status.failures);
        setSuccessCount(Math.max(0, status.processed - status.failures));
        setElapsed(Math.floor((Date.now() - startedAt) / 1000));
        if (status.current_cvm != null) setCurrentCompany(String(status.current_cvm));
        if (status.stage) setCurrentStep(status.stage);

        const logLines = status.log_lines ?? [];
        const newLines = logLines.slice(lastLogCountRef.current);
        lastLogCountRef.current = logLines.length;
        newLines.forEach((line) => addLog(line, "info"));

        const TERMINAL = new Set(["success", "error", "cancelled", "interrupted"]);
        if (TERMINAL.has(status.state)) {
          clearTimer();
          setProgress(status.state === "success" ? 100 : pct);
          setAppState(status.state === "cancelled" ? "idle" : "completed");
          addLog(
            status.state === "success"
              ? `Atualizacao concluida: ${status.processed} processadas.`
              : (status.error ?? `Atualizacao finalizada com estado: ${status.state}.`),
            status.state === "success" ? "success" : "warning",
          );
        }
      })();
    }, 2500);
  }

  function handleCancel() {
    if (appState === "confirming") {
      setAppState("idle");
      return;
    }

    if (appState === "running" || appState === "already_running") {
      clearTimer();
      setAppState("idle");
      addLog("Operacao cancelada pelo usuario.", "warning");
      if (jobId) {
        void cancelBatchJob(jobId).catch(() => undefined);
      }
    }
  }

  function handleReset() {
    clearTimer();
    setAppState("idle");
    setProgress(0);
    setProcessed(0);
    setSuccessCount(0);
    setFailCount(0);
    setCurrentCompany("");
    setCurrentStep("");
    setElapsed(0);
    setLogs([]);
  }

  function scrollToSection(id: string) {
    setActiveSection(id);
    document.getElementById(`section-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  useEffect(() => () => clearTimer(), []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const specialPanel =
    appState === "source_unavailable" ? (
      <Card className="animate-in rounded-[1.15rem] border-destructive/20 bg-destructive/5">
        <CardContent className="flex flex-col gap-4 px-5 sm:flex-row sm:items-center">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-[0.9rem] border border-destructive/25 bg-destructive/10 text-destructive">
            <CloudOffIcon className="size-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-semibold">Fonte indisponivel</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              O servico de dados da CVM esta inacessivel no momento. Verifique a conectividade e tente novamente em alguns minutos.
            </p>
          </div>
          <Button variant="outline" onClick={() => setAppState("idle")}>
            <RefreshCwIcon className="size-4" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    ) : appState === "no_permission" ? (
      <Card className="animate-in rounded-[1.15rem] border-amber-400/20 bg-amber-400/5">
        <CardContent className="flex flex-col gap-4 px-5 sm:flex-row sm:items-center">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-[0.9rem] border border-amber-400/25 bg-amber-400/10 text-amber-300">
            <LockIcon className="size-5" />
          </div>
          <div>
            <h3 className="font-heading font-semibold">Permissao insuficiente</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Atualizacoes em lote exigem permissao de administrador. Voce ainda pode visualizar o estado da base e o historico.
            </p>
          </div>
        </CardContent>
      </Card>
    ) : appState === "already_running" ? (
      <Card className="animate-in rounded-[1.15rem] border-primary/25 bg-primary/5">
        <CardContent className="flex items-center gap-4 px-5">
          <RefreshCwIcon className="size-5 animate-spin text-primary" />
          <div>
            <h3 className="font-heading font-semibold">Atualizacao ja em execucao</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Iniciada as 13:45 por sistema. Nao e possivel iniciar uma nova operacao.
            </p>
          </div>
        </CardContent>
      </Card>
    ) : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:px-10">
        <aside className="top-20 h-fit shrink-0 rounded-[1.35rem] border border-border/70 bg-card/92 p-3 shadow-[0_20px_70px_-55px_rgba(16,30,24,0.35)] lg:sticky lg:w-64">
          <div className="px-3 py-3">
            <Eyebrow className="mb-1">Operacoes</Eyebrow>
            <h1 className="font-heading text-lg font-semibold tracking-[-0.02em]">
              Atualizar base
            </h1>
          </div>
          <nav className="flex flex-row gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-[0.85rem] px-3 py-2 text-left text-sm transition",
                    activeSection === item.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/55 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.8} />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-4 rounded-[1rem] border border-border/55 bg-muted/25 p-3">
            <Eyebrow className="mb-2">Fonte CVM</Eyebrow>
            <SourceHealth status={appState === "source_unavailable" ? "offline" : "available"} />
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-7">
          <header className="flex flex-col gap-4 rounded-[1.5rem] border border-border/70 bg-background/88 p-5 shadow-[0_24px_80px_-58px_rgba(16,30,24,0.38)] sm:p-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <Eyebrow className="mb-2">Base empresarial</Eyebrow>
              <h1 className="font-heading text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Atualizar base
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Atualiza a base empresarial em lote a partir dos dados publicos da CVM. Esta
                operacao reprocessa multiplas companhias abertas e nao substitui o refresh individual.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isRunning ? (
                <Button variant="outline" onClick={handleCancel}>
                  <CircleStopIcon className="size-4" />
                  Cancelar
                </Button>
              ) : null}
              {isCompleted ? (
                <Button variant="ghost" onClick={handleReset}>
                  <RefreshCwIcon className="size-4" />
                  Nova operacao
                </Button>
              ) : null}
              <div className="flex rounded-[0.9rem] border border-border/65 bg-muted/35 p-1">
                {(["idle", "source_unavailable", "no_permission", "already_running"] as AppState[]).map((state) => (
                  <button
                    key={state}
                    type="button"
                    onClick={() => {
                      clearTimer();
                      setAppState(state);
                    }}
                    className={cn(
                      "rounded-[0.7rem] px-2.5 py-1.5 font-mono text-xs transition",
                      appState === state ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {specialPanel}

          <section id="section-status" className="scroll-mt-24">
            <SectionTitle icon={BarChart3Icon} title="Estado da base" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile label="Total de empresas" value="449" icon={Building2Icon} />
              <StatTile label="Ultima atualizacao" value="01/05" subvalue="14:32 - ha 18h" icon={Clock3Icon} />
              <StatTile label="Dados completos" value="418" subvalue="93,1% da base" icon={CheckCircle2Icon} tone="success" />
              <StatTile label="Incompletos / desatualizados" value="31" subvalue="6,9% da base" icon={AlertTriangleIcon} tone="warning" />
            </div>

            <Card className="mt-3 rounded-[1.15rem] bg-card/92">
              <CardContent className="flex flex-col gap-5 px-5 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <Eyebrow className="mb-3">Saude da fonte</Eyebrow>
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">CVM DFP/ITR</p>
                      <SourceHealth status={appState === "source_unavailable" ? "offline" : "available"} />
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Dados cadastrais</p>
                      <SourceHealth status="available" />
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">API auxiliar</p>
                      <SourceHealth status="partial" />
                    </div>
                  </div>
                </div>
                <div>
                  <Eyebrow className="mb-1">Ultima verificacao</Eyebrow>
                  <p className="font-mono text-sm tabular-nums">02/05/2026 08:01</p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="section-controls" className="scroll-mt-24">
            <SectionTitle icon={SlidersHorizontalIcon} title="Controles de atualizacao" />
            <Card className="rounded-[1.15rem] bg-card/92">
              <CardHeader>
                <Eyebrow>Tipo de atualizacao</Eyebrow>
              </CardHeader>
              <CardContent className="grid gap-3 px-5 sm:grid-cols-2 xl:grid-cols-4">
                {(Object.keys(UPDATE_TYPE_META) as UpdateType[]).map((type) => {
                  const item = UPDATE_TYPE_META[type];
                  const Icon = item.icon;
                  const active = updateType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      disabled={!canRun}
                      onClick={() => setUpdateType(type)}
                      className={cn(
                        "flex min-h-32 flex-col items-start gap-3 rounded-[1rem] border p-4 text-left transition",
                        active
                          ? "border-primary/45 bg-primary/8 shadow-[0_18px_44px_-34px_rgba(45,212,191,0.45)]"
                          : "border-border/60 bg-background/70 hover:border-primary/25 hover:bg-muted/25",
                        !canRun && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <Icon className={cn("size-5", active ? "text-primary" : "text-muted-foreground")} strokeWidth={1.8} />
                      <div>
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="mt-3 rounded-[1.15rem] bg-card/92">
              <CardHeader className="flex-row items-center justify-between">
                <Eyebrow>Filtros opcionais</Eyebrow>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterSector("Todos os setores");
                    setFilterStatus("all");
                    setFilterCvmFrom("");
                    setFilterCvmTo("");
                  }}
                >
                  Limpar
                </Button>
              </CardHeader>
              <CardContent className="grid gap-3 px-5 sm:grid-cols-2 xl:grid-cols-4">
                <AdminSelect label="Setor" value={filterSector} onChange={setFilterSector} options={SECTORS} disabled={!canRun} />
                <AdminSelect label="Status" value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTIONS} disabled={!canRun} />
                <AdminInput label="Cod. CVM - de" placeholder="Ex: 1000" value={filterCvmFrom} onChange={setFilterCvmFrom} disabled={!canRun} />
                <AdminInput label="Cod. CVM - ate" placeholder="Ex: 9999" value={filterCvmTo} onChange={setFilterCvmTo} disabled={!canRun} />
              </CardContent>
              {activeFilters.length ? (
                <div className="flex items-center gap-2 px-5 pb-4 text-xs text-primary">
                  <FilterIcon className="size-4" />
                  {activeFilters.length} filtro{activeFilters.length !== 1 ? "s" : ""} ativo{activeFilters.length !== 1 ? "s" : ""}
                </div>
              ) : null}
            </Card>

            {canRun ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={() => setAppState("confirming")}>
                  <PlayIcon className="size-4" />
                  Iniciar atualizacao
                </Button>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(total)} empresas - {UPDATE_TYPE_META[updateType].duration}
                </p>
              </div>
            ) : appState === "source_unavailable" ? (
              <div className="mt-4 flex items-center gap-2 rounded-[1rem] border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                <CloudOffIcon className="size-4" />
                Fonte CVM indisponivel. Atualizacao bloqueada.
              </div>
            ) : appState === "no_permission" ? (
              <div className="mt-4 flex items-center gap-2 rounded-[1rem] border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-sm text-amber-300">
                <LockIcon className="size-4" />
                Permissao de administrador necessaria para iniciar atualizacoes.
              </div>
            ) : null}
          </section>

          {(isRunning || isCompleted) ? (
            <section id="section-progress" className="scroll-mt-24">
              <SectionTitle icon={Clock3Icon} title="Progresso" />
              <Card className="rounded-[1.15rem] bg-card/92">
                <CardContent className="space-y-5 px-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {isRunning ? (
                        <RefreshCwIcon className="size-5 animate-spin text-primary" />
                      ) : (
                        <CheckCircle2Icon className="size-5 text-emerald-300" />
                      )}
                      <span className="font-medium">{isRunning ? "Em execucao..." : "Concluido"}</span>
                      <StatusBadge tone={isRunning ? "running" : "success"}>
                        {isRunning ? "Executando" : "Concluido"}
                      </StatusBadge>
                    </div>
                    <span className={cn("font-heading text-3xl font-semibold tabular-nums", isCompleted && "text-emerald-300")}>
                      {progress}%
                    </span>
                  </div>

                  <Progress value={progress} indicatorClassName={cn(isRunning && "animate-pulse")} />

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: "Processadas", value: processed, className: "text-foreground" },
                      { label: "Restantes", value: Math.max(total - processed, 0), className: "text-muted-foreground" },
                      { label: "Sucesso", value: successCount, className: "text-emerald-300" },
                      { label: "Falhas", value: failCount, className: failCount ? "text-destructive" : "text-muted-foreground" },
                    ].map((item) => (
                      <div key={item.label}>
                        <Eyebrow className="mb-1">{item.label}</Eyebrow>
                        <p className={cn("font-mono text-2xl font-semibold tabular-nums", item.className)}>{formatNumber(item.value)}</p>
                      </div>
                    ))}
                  </div>

                  {isRunning ? (
                    <div className="grid gap-4 border-t border-border/60 pt-5 lg:grid-cols-[1fr_1.3fr_auto] lg:items-center">
                      <div>
                        <Eyebrow className="mb-1">Empresa atual</Eyebrow>
                        <p className="font-mono text-sm font-medium">{currentCompany || "Preparando fila"}</p>
                      </div>
                      <div>
                        <Eyebrow className="mb-2">Etapa</Eyebrow>
                        <div className="flex flex-wrap gap-1.5">
                          {REFRESH_STAGES.map((step) => (
                            <span
                              key={step}
                              className={cn(
                                "rounded-full border px-2.5 py-1 font-mono text-xs",
                                currentStep === step
                                  ? "border-primary/35 bg-primary/12 text-primary"
                                  : "border-border/55 text-muted-foreground",
                              )}
                            >
                              {step}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Eyebrow className="mb-1">Tempo decorrido</Eyebrow>
                        <p className="font-mono text-sm tabular-nums">
                          {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {logs.length ? (
                    <div className="border-t border-border/60 pt-5">
                      <div className="mb-3 flex items-center justify-between">
                        <Eyebrow>Log em tempo real</Eyebrow>
                        <Button variant="ghost" size="sm">
                          <DownloadIcon className="size-4" />
                          Exportar log
                        </Button>
                      </div>
                      <div ref={logRef} className="h-48 overflow-y-auto rounded-[0.95rem] border border-border/55 bg-muted/25 p-3">
                        {logs.map((line, index) => (
                          <LogEntry key={`${line.time}-${index}`} line={line} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </section>
          ) : null}

          {isCompleted ? (
            <section id="section-results" className="scroll-mt-24">
              <SectionTitle icon={CheckCircle2Icon} title="Resultados" />
              <Card className="rounded-[1.15rem] bg-card/92">
                <CardContent className="space-y-5 px-5">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className={cn("flex size-12 items-center justify-center rounded-[1rem] border", failCount > 10 ? "border-amber-400/25 bg-amber-400/10 text-amber-300" : "border-emerald-400/25 bg-emerald-400/10 text-emerald-300")}>
                      {failCount > 10 ? <AlertTriangleIcon className="size-6" /> : <CheckCircle2Icon className="size-6" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-heading text-lg font-semibold">{failCount > 10 ? "Sucesso parcial" : "Atualizacao concluida"}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatNumber(total)} empresas processadas em {Math.floor(elapsed / 60)}m {elapsed % 60}s
                      </p>
                    </div>
                    <StatusBadge tone={failCount > 10 ? "warning" : "success"}>{failCount > 10 ? "Parcial" : "Sucesso"}</StatusBadge>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: "Total processado", value: total, className: "text-foreground" },
                      { label: "Atualizadas", value: successCount, className: "text-emerald-300" },
                      { label: "Ignoradas", value: 0, className: "text-muted-foreground" },
                      { label: "Falhas", value: failCount, className: failCount ? "text-destructive" : "text-muted-foreground" },
                    ].map((item) => (
                      <div key={item.label}>
                        <Eyebrow className="mb-1">{item.label}</Eyebrow>
                        <p className={cn("font-mono text-3xl font-semibold tabular-nums", item.className)}>{formatNumber(item.value)}</p>
                      </div>
                    ))}
                  </div>

                  {failCount > 0 ? (
                    <div className="rounded-[1rem] border border-destructive/15 bg-destructive/5 p-4 text-sm leading-6 text-muted-foreground">
                      {failCount} empresa{failCount !== 1 ? "s" : ""} nao puderam ser atualizadas. Causa mais comum: timeout ao baixar ITR. Verifique o log para detalhes por empresa.
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2 border-t border-border/60 pt-5">
                    {failCount > 0 ? (
                      <Button onClick={handleReset}>
                        <RotateCcwIcon className="size-4" />
                        Reprocessar falhas
                      </Button>
                    ) : null}
                    <Button variant="outline">
                      <TerminalSquareIcon className="size-4" />
                      Ver log detalhado
                    </Button>
                    <Button variant="ghost" onClick={handleReset}>
                      <RefreshCwIcon className="size-4" />
                      Nova operacao
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}

          <section id="section-history" className="scroll-mt-24">
            <SectionTitle icon={HistoryIcon} title="Historico de atualizacoes" />
            <Card className="rounded-[1.15rem] bg-card/92">
              <div className="overflow-x-auto">
                <div className="grid min-w-[760px] grid-cols-[160px_115px_110px_90px_110px_75px_36px] gap-3 border-b border-border/55 bg-muted/30 px-5 py-3">
                  {["Data/hora", "Tipo", "Status", "Duracao", "Processadas", "Falhas", ""].map((heading) => (
                    <Eyebrow key={heading}>{heading}</Eyebrow>
                  ))}
                </div>
                {HISTORY.map((item) => (
                  <HistoryRow key={`${item.date}-${item.type}`} item={item} />
                ))}
              </div>
            </Card>
          </section>
        </div>
      </div>

      {appState === "confirming" ? (
        <ConfirmationDialog updateType={updateType} filters={activeFilters} onCancel={handleCancel} onConfirm={handleConfirm} />
      ) : null}
    </div>
  );
}
