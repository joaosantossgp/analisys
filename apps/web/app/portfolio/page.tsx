"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Github,
  Linkedin,
  Mail,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

// ─── DATA ─────────────────────────────────────────────────────────────────────

const PROJECTS = [
  {
    id: "dashboard",
    title: "Brazilian Company Financial Dashboard",
    category: "Financial Dashboard",
    description:
      "A dashboard for exploring financial data from Brazilian public companies — DRE, balance sheet, KPIs, and market data in one place.",
    financeRelevance:
      "Company analysis, financial statements, indicators, and market data.",
    tools: ["React", "Financial APIs", "AI-assisted coding"],
    status: "In Progress" as const,
    github: "#",
    demo: null as string | null,
  },
  {
    id: "equity-helper",
    title: "Equity Research Helper",
    category: "Equity Research Tool",
    description:
      "A tool for organizing company analysis, assumptions, valuation notes, and research links in a structured, searchable workflow.",
    financeRelevance:
      "Valuation workflow, qualitative research, and investment thesis organization.",
    tools: ["React", "TypeScript", "AI-assisted coding"],
    status: "Prototype" as const,
    github: "#",
    demo: null as string | null,
  },
  {
    id: "study-system",
    title: "Study & Productivity System",
    category: "Productivity / Automation",
    description:
      "A personal system for organizing study fronts, courses, books, deadlines, and review sessions across multiple disciplines.",
    financeRelevance:
      "Supports long-term learning in economics, markets, valuation, and programming.",
    tools: ["Excel", "Automation logic", "AI-assisted planning"],
    status: "Prototype" as const,
    github: "#",
    demo: null as string | null,
  },
];

const RESEARCH = [
  {
    id: "cfa",
    title: "CFA Research Challenge — Local Brazil",
    institution: "CFA Institute",
    date: "Sep. 2024 – Jan. 2025",
    company: "Vibra (VBBR3)",
    result: "Vice-Champion",
    resultType: "top" as const,
    description:
      "Structured equity research challenge involving full company analysis, DCF valuation, investment thesis development, and competitive presentation.",
  },
  {
    id: "constellation",
    title: "Constellation Challenge 2024",
    institution: "Constellation Asset Management",
    date: "Mar. 2024 – Apr. 2024",
    company: "Mercado Libre (MELI)",
    result: "Semi-Finalist",
    resultType: "mid" as const,
    description:
      "Developed investment research and company analysis in a competitive challenge environment, covering business model, risks, and valuation.",
  },
  {
    id: "btg",
    title: "BTG Pactual Experience 2023",
    institution: "BTG Pactual",
    date: "Oct. 2023 – Dec. 2023",
    company: "Mater Dei (MATD3) / Madero",
    result: "Finalist",
    resultType: "mid" as const,
    description:
      "Finance experience focused on company analysis, investment reasoning, and structured market presentation for two companies in different sectors.",
  },
  {
    id: "apex",
    title: "Internal Research Challenge",
    institution: "Mentored by Apex Capital",
    date: "Mar. 2023 – Sep. 2023",
    company: "Mater Dei (MATD3)",
    result: null as string | null,
    resultType: null as "top" | "mid" | null,
    description:
      "Built research experience through company analysis, financial reasoning, and market-oriented discussion, with direct mentorship from Apex Capital professionals.",
  },
];

const EXPERIENCE = [
  {
    id: "gmf",
    title: "Member — GMF",
    org: "Grupo de Mercado Financeiro da Unicamp",
    date: "Feb. 2023 – Jan. 2025",
    description:
      "Participated in the financial market league at UNICAMP, contributing to education initiatives, accounting classes, financial education projects, research activities, and the 2024 member selection process.",
    placeholder: false,
  },
  {
    id: "internship",
    title: "Internship Experience",
    org: "To be added",
    date: "—",
    description: "Placeholder for recent internship experience.",
    placeholder: true,
  },
];

const EDUCATION = [
  {
    id: "unicamp",
    degree: "Bachelor's Degree in Economic Sciences",
    institution: "Universidade Estadual de Campinas — UNICAMP",
    detail: "Institute of Economics",
    date: "2022 – 2026",
    current: true,
  },
  {
    id: "etec",
    degree: "High School + Technical Education in Business Administration",
    institution: "ETEC Prefeito Braz Paschoalin",
    detail: null as string | null,
    date: "2019 – 2021",
    current: false,
  },
];

const SKILLS = [
  {
    group: "Financial Analysis",
    items: [
      "Valuation",
      "Equity research",
      "Accounting & balance sheet",
      "Investments",
      "Derivatives",
      "Macroeconomics",
    ],
  },
  {
    group: "Data & Tools",
    items: [
      "Advanced Excel",
      "Python (beginner)",
      "R (beginner)",
      "Dashboards",
      "APIs",
      "Data workflows",
    ],
  },
  {
    group: "AI-Assisted Development",
    items: [
      "Vibe coding",
      "Claude Code",
      "Codex",
      "GitHub",
      "Financial tools",
      "Automation experiments",
    ],
  },
  {
    group: "Languages",
    items: ["Portuguese (native)", "English (advanced)"],
  },
];

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "In Progress"
      ? "border-primary/30 bg-primary/10 text-primary/90"
      : status === "Prototype"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "border-border/80 bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.13em] whitespace-nowrap ${cls}`}
    >
      {status}
    </span>
  );
}

function ResultBadge({
  result,
  type,
}: {
  result: string;
  type: "top" | "mid";
}) {
  const cls =
    type === "top"
      ? "border-primary/30 bg-primary/10 text-primary/90"
      : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.13em] whitespace-nowrap ${cls}`}
    >
      {result}
    </span>
  );
}

// ─── SECTIONS ─────────────────────────────────────────────────────────────────

function Hero() {
  const metrics = [
    { label: "CFA Challenge", value: "Vice-Champion", sub: "2024–2025" },
    { label: "BTG Experience", value: "Finalist", sub: "2023" },
    { label: "Research Challenges", value: "4 total", sub: "2023–2025" },
    { label: "Focus", value: "Equity Research", sub: "& Valuation" },
  ];

  return (
    <section className="border-b border-border/60 py-20 pb-16">
      <div className="mx-auto w-full max-w-4xl px-6">
        {/* Meta row */}
        <div className="mb-8 flex items-center gap-3">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            UNICAMP · Economics · Class of 2026
          </span>
          <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground/40" />
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.13em] text-primary/90">
            Open to opportunities
          </span>
        </div>

        {/* Headline */}
        <h1 className="mb-6 max-w-2xl font-heading text-[clamp(2.5rem,5.5vw,4.25rem)] font-bold leading-[1.05] tracking-[-0.045em] text-foreground">
          Financial markets,
          <br />
          economic analysis,
          <br />
          <span className="text-primary">and AI-assisted data tools.</span>
        </h1>

        {/* Subline */}
        <p className="mb-10 max-w-[560px] text-[1.0625rem] leading-relaxed text-muted-foreground">
          I study economics and build practical tools for financial analysis —
          combining market research, valuation, data workflows, and AI-assisted
          development.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="#projects"
            className="inline-flex items-center gap-2 rounded-[0.7rem] bg-primary px-[1.15rem] py-[0.55rem] text-sm font-medium text-primary-foreground transition-[filter] hover:brightness-110"
          >
            View Projects <ArrowRight className="size-3.5" />
          </a>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 rounded-[0.7rem] border border-border/80 px-[1.15rem] py-[0.55rem] text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:text-primary"
          >
            Contact
          </a>
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-[0.7rem] border border-border/80 px-[1.15rem] py-[0.55rem] text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:text-primary"
          >
            <Linkedin className="size-3.5" /> LinkedIn
          </a>
        </div>

        {/* Metric mini-cards */}
        <div className="mt-12 hidden flex-wrap gap-3 sm:flex">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-[0.7rem] border border-border/50 bg-card/90 px-4 py-3 backdrop-blur-sm"
            >
              <div className="mb-1 text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                {m.label}
              </div>
              <div className="mb-0.5 font-heading text-[0.95rem] font-semibold tracking-[-0.01em] text-foreground">
                {m.value}
              </div>
              <div className="font-mono text-[0.65rem] text-muted-foreground">
                {m.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Projects() {
  const [filter, setFilter] = useState<string>("All");
  const statuses = ["All", "In Progress", "Prototype", "Finished"];
  const filtered =
    filter === "All" ? PROJECTS : PROJECTS.filter((p) => p.status === filter);

  return (
    <section className="border-b border-border/60 py-20" id="projects">
      <div className="mx-auto w-full max-w-4xl px-6">
        {/* Header */}
        <div className="mb-10">
          <span className="mb-3 block text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            AI-Assisted Development
          </span>
          <h2 className="mb-3 font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.035em] text-foreground">
            Featured Projects
          </h2>
          <p className="mb-6 max-w-[540px] text-[0.95rem] leading-relaxed text-muted-foreground">
            Practical tools and experiments built with AI assistance — focused
            on financial analysis, data workflows, and market research.
          </p>
          {/* Filter pills */}
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full border px-3.5 py-1 text-[0.72rem] font-medium transition-all ${
                  filter === s
                    ? "border-primary/45 bg-primary/10 text-primary"
                    : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <div
              key={project.id}
              className="flex flex-col gap-4 rounded-[1.2rem] border border-border/60 bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_18px_36px_-24px_rgba(16,30,24,0.18)]"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-[0.64rem] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                  {project.category}
                </span>
                <StatusBadge status={project.status} />
              </div>

              {/* Title + desc */}
              <div>
                <h3 className="mb-2 font-heading text-[0.95rem] font-semibold leading-[1.3] tracking-[-0.01em] text-foreground">
                  {project.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {project.description}
                </p>
              </div>

              {/* Finance relevance */}
              <div className="rounded-[0.7rem] border border-primary/15 bg-primary/5 px-4 py-3 text-xs leading-[1.5] text-primary/80">
                <span className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] opacity-70">
                  Finance relevance ·{" "}
                </span>
                {project.financeRelevance}
              </div>

              {/* Tool tags */}
              <div className="flex flex-wrap gap-1">
                {project.tools.map((t) => (
                  <span
                    key={t}
                    className="rounded-[0.4rem] bg-muted px-2.5 py-1 font-mono text-[0.7rem] font-medium text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>

              {/* Links */}
              <div className="mt-auto flex gap-2 border-t border-border/60 pt-3">
                <a
                  href={project.github}
                  className="inline-flex items-center gap-1.5 rounded-[0.6rem] border border-border/70 px-3 py-1.5 text-[0.72rem] font-medium text-muted-foreground transition-all hover:border-primary/35 hover:bg-primary/5 hover:text-primary"
                >
                  <Github className="size-3.5" /> GitHub
                </a>
                {project.demo && (
                  <a
                    href={project.demo}
                    className="inline-flex items-center gap-1.5 rounded-[0.6rem] border border-border/70 px-3 py-1.5 text-[0.72rem] font-medium text-muted-foreground transition-all hover:border-primary/35 hover:bg-primary/5 hover:text-primary"
                  >
                    <ExternalLink className="size-3.5" /> Live demo
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Research() {
  return (
    <section className="border-b border-border/60 py-20" id="research">
      <div className="mx-auto w-full max-w-4xl px-6">
        <div className="mb-10">
          <span className="mb-3 block text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Equity Research
          </span>
          <h2 className="mb-3 font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.035em] text-foreground">
            Research &amp; Finance Experience
          </h2>
          <p className="max-w-[520px] text-[0.95rem] leading-relaxed text-muted-foreground">
            Competitive research challenges and structured equity analysis
            programs.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative flex flex-col gap-5">
          {/* Vertical line */}
          <div className="absolute bottom-4 left-[15px] top-4 w-px bg-border/80" />

          {RESEARCH.map((item, i) => (
            <div key={item.id} className="flex items-start gap-5">
              {/* Dot */}
              <div className="relative z-10 flex size-[31px] shrink-0 items-center justify-center rounded-full border-2 border-primary/40 bg-[color-mix(in_oklch,var(--primary)_10%,var(--background))] font-heading text-[0.8rem] font-bold text-primary">
                {["01", "02", "03", "04"][i]}
              </div>

              {/* Card */}
              <div className="flex-1 pb-2">
                <div className="rounded-[1.2rem] border border-border/60 bg-card p-6">
                  {/* Top row */}
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="mb-1 font-heading text-[0.95rem] font-semibold leading-snug tracking-[-0.01em] text-foreground">
                        {item.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.institution}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="font-mono text-[0.68rem] text-muted-foreground">
                        {item.date}
                      </span>
                      {item.result && item.resultType && (
                        <ResultBadge
                          result={item.result}
                          type={item.resultType}
                        />
                      )}
                    </div>
                  </div>

                  {/* Company chip */}
                  <div className="mb-4 flex flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Company
                      </span>
                      <span className="rounded-[5px] border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[0.72rem] font-medium text-primary">
                        {item.company}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm leading-[1.65] text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Experience() {
  return (
    <section className="border-b border-border/60 py-20" id="experience">
      <div className="mx-auto w-full max-w-4xl px-6">
        <div className="mb-10">
          <span className="mb-3 block text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Professional
          </span>
          <h2 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.035em] text-foreground">
            Experience
          </h2>
        </div>

        <div className="flex flex-col gap-5">
          {EXPERIENCE.map((exp) => (
            <div
              key={exp.id}
              className={`rounded-[1.2rem] border bg-card p-6 ${
                exp.placeholder
                  ? "border-dashed border-border/60 opacity-65"
                  : "border-border/60"
              }`}
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2 font-heading text-[0.95rem] font-semibold leading-snug tracking-[-0.01em] text-foreground">
                    {exp.title}
                    {exp.placeholder && (
                      <span className="inline-flex items-center rounded-full border border-border/80 bg-muted px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                        To be added
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {exp.org}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[0.68rem] text-muted-foreground">
                  {exp.date}
                </span>
              </div>
              <p className="text-sm leading-[1.65] text-muted-foreground">
                {exp.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Education() {
  return (
    <section className="border-b border-border/60 py-20" id="education">
      <div className="mx-auto w-full max-w-4xl px-6">
        <div className="mb-10">
          <span className="mb-3 block text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Academic Background
          </span>
          <h2 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.035em] text-foreground">
            Education
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {EDUCATION.map((edu) => (
            <div
              key={edu.id}
              className="rounded-[1.2rem] border border-border/60 bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_18px_36px_-24px_rgba(16,30,24,0.18)]"
            >
              <div className="mb-4 flex items-start justify-between">
                {edu.current ? (
                  <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-primary/90">
                    Current
                  </span>
                ) : (
                  <span />
                )}
                <span className="font-mono text-[0.68rem] text-muted-foreground">
                  {edu.date}
                </span>
              </div>
              <div className="mb-2 font-heading text-[0.95rem] font-semibold leading-[1.35] tracking-[-0.01em] text-foreground">
                {edu.degree}
              </div>
              <div className="mb-1 text-sm font-medium text-muted-foreground">
                {edu.institution}
              </div>
              {edu.detail && (
                <div className="text-xs text-muted-foreground/80">
                  {edu.detail}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Skills() {
  return (
    <section className="border-b border-border/60 py-20" id="skills">
      <div className="mx-auto w-full max-w-4xl px-6">
        <div className="mb-10">
          <span className="mb-3 block text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Competencies
          </span>
          <h2 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.035em] text-foreground">
            Skills &amp; Focus Areas
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {SKILLS.map((group) => (
            <div
              key={group.group}
              className="rounded-[1.2rem] border border-border/60 bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_18px_36px_-24px_rgba(16,30,24,0.18)]"
            >
              <div className="mb-4 font-heading text-sm font-semibold tracking-[-0.01em] text-foreground">
                {group.group}
              </div>
              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center rounded-full border border-border/80 bg-background px-3 py-1 text-xs font-medium leading-none text-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section className="py-20" id="contact">
      <div className="mx-auto w-full max-w-4xl px-6">
        <div className="flex flex-col items-center gap-6 rounded-[1.6rem] border border-border/60 bg-card px-10 py-12 text-center">
          <div>
            <span className="mb-3 block text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Get in touch
            </span>
            <h2 className="mb-4 font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.035em] text-foreground">
              Let&apos;s connect
            </h2>
            <p className="mx-auto max-w-[420px] text-[0.95rem] leading-relaxed text-muted-foreground">
              I&apos;m open to conversations about equity research, financial
              analysis, data tools, or internship and collaboration
              opportunities.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[0.7rem] border border-border/70 px-[1.1rem] py-[0.55rem] text-sm font-medium text-muted-foreground transition-all hover:border-primary/35 hover:bg-primary/5 hover:text-primary"
            >
              <Linkedin className="size-3.5" /> LinkedIn
            </Link>
            <Link
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[0.7rem] border border-border/70 px-[1.1rem] py-[0.55rem] text-sm font-medium text-muted-foreground transition-all hover:border-primary/35 hover:bg-primary/5 hover:text-primary"
            >
              <Github className="size-3.5" /> GitHub
            </Link>
            <Link
              href="mailto:your@email.com"
              className="inline-flex items-center gap-2 rounded-[0.7rem] border border-border/70 px-[1.1rem] py-[0.55rem] text-sm font-medium text-muted-foreground transition-all hover:border-primary/35 hover:bg-primary/5 hover:text-primary"
            >
              <Mail className="size-3.5" /> Email
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  return (
    <main>
      <Hero />
      <Projects />
      <Research />
      <Experience />
      <Education />
      <Skills />
      <Contact />
    </main>
  );
}
