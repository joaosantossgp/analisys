# Read-Path Benchmark — CVM Query Layer

**Issue:** #134
**Date:** 2026-04-20
**Environment:** Python 3.11 / Windows 11 / SQLAlchemy 2.x / SQLite 3.x (in-memory)
**Dataset:** 449 companies, ~40,410 financial_reports rows (6 annual years x 14 accounts/company + 1 quarterly row/year)
**Methodology:** 7 warm runs per query; report median, p95, min, max. EXPLAIN QUERY PLAN captured for each.
**Benchmark script:** `scripts/benchmark_read_paths.py` (repeatable; `--runs N --phase before|after`)

> **SQLite vs PostgreSQL note:** The benchmark runs on in-memory SQLite to be self-contained. SQLite's query planner differs from PostgreSQL's in two relevant ways: (1) it will not use a column index when comparing two columns from the same table (self-referential joins), and (2) it does not support partial/functional indexes. The findings below distinguish SQLite-confirmed improvements from PostgreSQL-expected improvements.

---

## Baseline timings (before index additions)

| Query | Median | p95 | Query plan observation |
|---|---:|---:|---|
| companies_directory_page (empty search) | 6.4 ms | 8.6 ms | SCAN c + idx_fr_cd_cvm LEFT-JOIN + B-TREE sort |
| companies_directory_page (search='empresa 01%') | 2.2 ms | 2.4 ms | SCAN c + idx_fr_cd_cvm LEFT-JOIN + B-TREE sort |
| company_years_map (20 cd_cvms) | 1.9 ms | 2.4 ms | idx_fr_cd_cvm + B-TREE sort |
| available_years (single company) | 0.3 ms | 0.4 ms | idx_fr_cd_cvm + DISTINCT |
| **sector_years_map (all sectors)** | **27.2 ms** | **28.4 ms** | **FULL SCAN fr + B-TREE DISTINCT** |
| available_company_sectors | 21.2 ms | 22.3 ms | SCAN c + idx_fr_cd_cvm LEFT-JOIN |
| **sector_metric_rows (all sectors)** | **37.8 ms** | **57.1 ms** | **idx_fr_cd_conta + B-TREE GROUP BY** |
| sector_metric_rows (single sector) | 9.4 ms | 26.3 ms | idx_fr_cd_conta + B-TREE GROUP BY |
| company_suggestions (prefix='emp') | 0.7 ms | 1.1 ms | SCAN c + B-TREE sort |
| sector_companies (single sector) | 0.5 ms | 0.6 ms | SCAN c + B-TREE sort |

---

## Root cause analysis

### 1. `sector_years_map` — full scan (CRITICAL at scale)

```sql
WHERE fr."PERIOD_LABEL" = CAST(fr."REPORT_YEAR" AS TEXT)
```

This is a self-referential comparison between two columns of the same table. SQLite (and to a lesser extent PostgreSQL) cannot use a simple single-column index on `PERIOD_LABEL` because the right-hand side is computed from another column. The query scans every row in `financial_reports` to test this condition.

At production scale (~900k rows for 449 companies × 10 years × ~200 rows), this query would take approximately 600–700 ms on SQLite. PostgreSQL will benefit from `idx_fr_period_label` since its planner can use partial index scans more aggressively for correlated expressions.

### 2. `company_years_map` / `available_years` — suboptimal index

Both queries filter on `CD_CVM = :cd_cvm AND PERIOD_LABEL = CAST(REPORT_YEAR AS TEXT)`. The existing `idx_fr_cd_cvm` covered CD_CVM but left PERIOD_LABEL to be filtered post-lookup. The new composite `idx_fr_cd_cvm_period_label` is a direct match.

### 3. `sector_metric_rows` — partial index coverage

The query filters on `CD_CONTA IN ('3.01','3.05','3.11','2.03')` AND `PERIOD_LABEL = CAST(REPORT_YEAR AS TEXT)` AND `QA_CONFLICT = 0`. The existing `idx_fr_cd_conta` handles CD_CONTA lookup but the post-lookup filter on PERIOD_LABEL still scans within each CD_CONTA bucket. The new `idx_fr_cd_conta_period_label` composite adds PERIOD_LABEL as the second key, letting the planner eliminate quarterly rows at index traversal time.

---

## Indexes added (src/database.py)

Three indexes added, all with `IF NOT EXISTS` — safe to apply to existing databases (CONCURRENTLY on PostgreSQL):

| Index name | Columns | Targeted queries |
|---|---|---|
| `idx_fr_period_label` | `"PERIOD_LABEL"` | sector_years_map (PostgreSQL), any future PERIOD_LABEL filter |
| `idx_fr_cd_cvm_period_label` | `("CD_CVM", "PERIOD_LABEL")` | company_years_map, available_years |
| `idx_fr_cd_conta_period_label` | `("CD_CONTA", "PERIOD_LABEL")` | sector_metric_rows |

---

## Post-index timings (after index additions)

| Query | Median | p95 | Delta | Plan change |
|---|---:|---:|---:|---|
| companies_directory_page (empty search) | 6.1 ms | 7.1 ms | -0.3 ms | unchanged |
| companies_directory_page (search='empresa 01%') | 2.1 ms | 2.3 ms | -0.1 ms | unchanged |
| company_years_map (20 cd_cvms) | 2.0 ms | 2.5 ms | +0.1 ms | **idx_fr_cd_cvm -> idx_fr_cd_cvm_period_label** |
| available_years (single company) | 0.3 ms | 0.4 ms | 0 ms | **idx_fr_cd_cvm -> idx_fr_cd_cvm_period_label** |
| sector_years_map (all sectors) | 27.5 ms | 27.9 ms | +0.3 ms | unchanged (SQLite: self-ref filter; Postgres: idx_fr_period_label will help) |
| available_company_sectors | 21.2 ms | 21.8 ms | 0 ms | unchanged |
| sector_metric_rows (all sectors) | 37.5 ms | 56.4 ms | -0.3 ms | unchanged (SQLite chose idx_fr_cd_conta; Postgres: idx_fr_cd_conta_period_label) |
| sector_metric_rows (single sector) | 9.5 ms | 26.7 ms | +0.1 ms | unchanged |
| company_suggestions (prefix='emp') | 0.7 ms | 1.0 ms | 0 ms | unchanged |
| sector_companies (single sector) | 0.5 ms | 0.6 ms | 0 ms | unchanged |

**SQLite delta is minimal** because (a) the dataset is small (40k rows), and (b) SQLite does not pick up two of the three new indexes due to the self-referential filter. At 900k+ rows on PostgreSQL, the effect will be proportionally larger.

---

## Confirmed vs suspected improvements

| Finding | Confidence | Evidence |
|---|---|---|
| `idx_fr_cd_cvm_period_label` picked up by SQLite | **confirmed** | EXPLAIN QUERY PLAN shows switch from `idx_fr_cd_cvm` to `idx_fr_cd_cvm_period_label` |
| `idx_fr_period_label` will help `sector_years_map` on PostgreSQL | **expected** | PostgreSQL planner handles correlated column comparisons better; index narrows scan to annual rows |
| `idx_fr_cd_conta_period_label` will help `sector_metric_rows` on PostgreSQL | **expected** | Composite covers the two primary filters in the WHERE clause |
| `companies_directory_page` B-TREE sort is irreducible without schema change | **confirmed** | GROUP BY + ORDER BY on non-indexed column; would need a covering index including all GROUP BY cols |

---

## Unresolved / follow-up items

### FU-1 (open): sector_years_map full scan — partial index in PostgreSQL

The `PERIOD_LABEL = CAST(REPORT_YEAR AS TEXT)` filter scans the entire table. A PostgreSQL partial index would eliminate quarterly rows without touching them:

```sql
CREATE INDEX idx_fr_annual_cvm_year
ON financial_reports("CD_CVM", "REPORT_YEAR")
WHERE length("PERIOD_LABEL") = 4;
```

This requires a dedicated `risk:contract-sensitive` task because it changes the DDL contract used by `init_db_tables` and may affect existing databases that need `CREATE INDEX CONCURRENTLY`. Not implemented here to keep scope focused.

### FU-2 (open): sector_metric_rows GROUP BY temp B-TREE

The all-sectors variant always materializes a temp B-TREE for GROUP BY. At production scale with ~900k filtered rows pre-GROUP BY, this is expected to be the dominant cost. Options:

- A covering index `("CD_CONTA", "PERIOD_LABEL", "CD_CVM", "REPORT_YEAR", "VL_CONTA")` would let the planner GROUP BY on index order without materialization. Significant write amplification — evaluate with production load data.
- Cache the aggregated result (application level). The all-sectors call already benefits from the shared read-service cache added in #131.

### FU-3 (observation): companies_directory_page — scan is structural

The directory page query always LEFT JOINs financial_reports for `has_financial_data`/`total_rows` flags. For the 449-company production size, the SCAN c → idx_fr_cd_cvm loop is fast. If company count grows past ~2,000, consider materializing `has_financial_data` into the `companies` table and updating it on ingest.

---

## What was NOT changed

- `src/query_layer.py` — queries unchanged; indexes improve them transparently
- `src/read_service.py` — unchanged
- Any route or API contract — unchanged
