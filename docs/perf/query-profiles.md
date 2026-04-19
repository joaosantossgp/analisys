# Query Performance Profiles — CVM Query Layer

**Issue:** #109  
**Status:** Pre-index baseline (static analysis). Actual `EXPLAIN ANALYZE` runs required against a production-sized dataset.  
**Next step:** After Issue #97 (indexes) lands, run the capture script below and paste output into the "Post-index" sections.

---

## How to capture EXPLAIN ANALYZE output

Connect to the production/staging database (Railway URL from `.env` / Railway secrets), then run:

```sql
-- Template — replace the WHERE clause with real bind values before running
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
<paste query here>;
```

Alternatively, set `LOG_LEVEL=DEBUG` and enable `slow_query_warn` with `threshold_ms=0` to
capture all queries in application logs, then replay them against a dev copy with `EXPLAIN ANALYZE`.

---

## Target queries

### 1. `get_companies_directory_page` — directory listing with count

**File:** `src/query_layer.py:135`  
**Called by:** `GET /companies` (every page load), `get_companies()`

#### SQL structure

```sql
-- Query 1: total count (subquery pattern)
SELECT COUNT(*) AS total_items
FROM (
    SELECT c.cd_cvm
    FROM companies c
    LEFT JOIN financial_reports fr ON fr."CD_CVM" = c.cd_cvm
    WHERE <search/sector filters>
    GROUP BY c.cd_cvm, c.company_name, c.ticker_b3, c.setor_analitico, c.setor_cvm
) company_rows;

-- Query 2: paginated rows
SELECT c.cd_cvm, c.company_name, ..., COUNT(fr."CD_CVM"), c.coverage_rank
FROM companies c
LEFT JOIN financial_reports fr ON fr."CD_CVM" = c.cd_cvm
WHERE <search/sector filters>
GROUP BY c.cd_cvm, c.company_name, ..., c.coverage_rank
ORDER BY c.company_name ASC
LIMIT 20 OFFSET 0;
```

#### Static analysis

| Aspect | Risk | Notes |
|---|---|---|
| `LEFT JOIN financial_reports` on `CD_CVM` | **HIGH** | `financial_reports` can have millions of rows. Without an index on `"CD_CVM"`, this JOIN triggers a sequential scan. |
| `COUNT(*)` in a subquery wrapping another GROUP BY | **HIGH** | Double aggregation. Planner may materialise the inner query. Window function alternative: `COUNT(*) OVER ()` removes the subquery. |
| `ORDER BY c.company_name` | Medium | Needs an index on `companies(company_name)` for large tables, otherwise sort. |
| `LOWER(c.company_name) LIKE :search` | Medium | Pattern with leading `%` disables index usage. Full-text index (`pg_trgm`) would help. |
| `GROUP BY` 6 columns | Low | Covered by the JOIN key; cardinality is bounded by company count (~449). |

#### Optimisation candidates

1. **Index** `financial_reports("CD_CVM")` — eliminates the sequential scan on the JOIN (Issue #97).
2. **Rewrite COUNT subquery** to `SELECT COUNT(DISTINCT c.cd_cvm) ... LEFT JOIN ... WHERE ...` — removes one level of aggregation.
3. **pg_trgm index** on `lower(company_name)` for search — lower priority, only needed if company count grows past ~10k.

#### Pre-index EXPLAIN ANALYZE

```
-- Paste output here after running against a production-sized dataset
-- (>100 companies, >2 years of financial data)
```

#### Post-index EXPLAIN ANALYZE (after Issue #97)

```
-- Paste output here after Issue #97 indexes are deployed
```

---

### 2. `get_statement` — per-company statement fetch

**File:** `src/query_layer.py:442`  
**Called by:** `GET /companies/{cd_cvm}/statement/{stmt_type}`

#### SQL structure

```sql
SELECT "CD_CONTA", "DS_CONTA", "STANDARD_NAME", "LINE_ID_BASE",
       "PERIOD_LABEL", "VL_CONTA"
FROM financial_reports
WHERE "CD_CVM" = :cd_cvm
  AND "STATEMENT_TYPE" = :stmt
  AND "REPORT_YEAR" IN (:y0, :y1, ...)
  AND "QA_CONFLICT" = false;
```

#### Static analysis

| Aspect | Risk | Notes |
|---|---|---|
| Point lookup on `CD_CVM` + `STATEMENT_TYPE` + `REPORT_YEAR` | **HIGH** | Without a composite index, this scans all rows for the company. |
| `QA_CONFLICT = false` filter | Low | After `CD_CVM` + `STMT_TYPE` filter, remaining row count is small. |
| `IN (:y0, :y1, ...)` with up to 10 years | Low | Small list; planner uses bitmap index scan if index exists. |

#### Optimisation candidates

1. **Composite index** `financial_reports("CD_CVM", "STATEMENT_TYPE", "REPORT_YEAR")` — makes this query an index range scan (Issue #97).

#### Pre-index EXPLAIN ANALYZE

```
-- Paste output here
```

#### Post-index EXPLAIN ANALYZE (after Issue #97)

```
-- Paste output here
```

---

### 3. `get_kpi_accounts` — KPI aggregation per company

**File:** `src/query_layer.py:496`  
**Called by:** `GET /companies/{cd_cvm}/kpis`

#### SQL structure

```sql
SELECT "REPORT_YEAR", "PERIOD_LABEL", "CD_CONTA", SUM("VL_CONTA") AS "VL_CONTA"
FROM financial_reports
WHERE "CD_CVM" = :cd_cvm
  AND "REPORT_YEAR" IN (:y0, ...)
  AND "CD_CONTA" IN (:c0, ..., :c13)   -- 14 KPI account codes
  AND "QA_CONFLICT" = false
GROUP BY "REPORT_YEAR", "PERIOD_LABEL", "CD_CONTA";
```

#### Static analysis

| Aspect | Risk | Notes |
|---|---|---|
| `CD_CVM` point lookup + `CD_CONTA` IN (14 values) | **HIGH** | Without composite index, full company scan. 14 codes × N years = small result set but large scan. |
| `GROUP BY` 3 columns | Low | Result set is bounded: max 14 accounts × 10 years = 140 rows. |
| `SUM` aggregation | Low | Minimal compute; mostly I/O bound. |

#### Optimisation candidates

1. **Composite index** `financial_reports("CD_CVM", "CD_CONTA", "REPORT_YEAR")` — covers the filter and makes this query an index-only scan for included columns (Issue #97).

#### Pre-index EXPLAIN ANALYZE

```
-- Paste output here
```

#### Post-index EXPLAIN ANALYZE (after Issue #97)

```
-- Paste output here
```

---

### 4. `get_sector_metric_rows` — sector aggregation

**File:** `src/query_layer.py:218`  
**Called by:** `GET /sectors/{sector_name}/metrics`

#### SQL structure

```sql
SELECT c.cd_cvm, c.company_name, c.ticker_b3,
       COALESCE(NULLIF(TRIM(c.setor_analitico),''), ...) AS sector_name,
       fr."REPORT_YEAR", fr."CD_CONTA",
       SUM(fr."VL_CONTA") AS account_value
FROM financial_reports fr
JOIN companies c ON c.cd_cvm = fr."CD_CVM"
WHERE fr."PERIOD_LABEL" = CAST(fr."REPORT_YEAR" AS TEXT)
  AND fr."QA_CONFLICT" = false
  AND fr."CD_CONTA" IN ('3.01', '3.05', '3.11', '2.03')
  [AND sector_name = :sector_name]
  [AND fr."REPORT_YEAR" IN (:y0, ...)]
GROUP BY c.cd_cvm, c.company_name, c.ticker_b3, sector_name,
         fr."REPORT_YEAR", fr."CD_CONTA";
```

#### Static analysis

| Aspect | Risk | Notes |
|---|---|---|
| `PERIOD_LABEL = CAST(REPORT_YEAR AS TEXT)` filter | **HIGH** | Expression comparison — cannot use a B-tree index on `PERIOD_LABEL` alone unless a functional index is added. |
| `JOIN companies` on `cd_cvm` | Low | `companies` is small (~449 rows); hash join is fast. |
| Sector filter via `COALESCE(NULLIF(...))` expression | Medium | Expression in WHERE — requires expression index or table scan on `companies` (tiny table, low risk). |
| `CD_CONTA` IN (4 values) without `CD_CVM` filter | **HIGH** | Scans all rows in `financial_reports` matching 4 account codes — no company-level filter. |

#### Optimisation candidates

1. **Index** `financial_reports("CD_CONTA", "REPORT_YEAR")` including `PERIOD_LABEL` — enables index scan for the IN (4 codes) + year filter (Issue #97).
2. **Generated column** or partial index for `PERIOD_LABEL = REPORT_YEAR::text` to speed up the annual filter.

#### Pre-index EXPLAIN ANALYZE

```
-- Paste output here
```

#### Post-index EXPLAIN ANALYZE (after Issue #97)

```
-- Paste output here
```

---

### 5. `get_company_years_map` — bulk year lookup

**File:** `src/query_layer.py:322`  
**Called by:** `get_companies()` — runs once per directory page (up to 20 companies)

#### SQL structure

```sql
SELECT "CD_CVM", "REPORT_YEAR"
FROM financial_reports
WHERE "CD_CVM" IN (:cd0, :cd1, ..., :cd19)   -- up to 20 values per page
  AND "PERIOD_LABEL" = CAST("REPORT_YEAR" AS TEXT)
GROUP BY "CD_CVM", "REPORT_YEAR"
ORDER BY "CD_CVM", "REPORT_YEAR";
```

#### Static analysis

| Aspect | Risk | Notes |
|---|---|---|
| `CD_CVM` IN (up to 20) | Medium | With an index on `CD_CVM`, becomes 20 index range scans merged by a BitmapOr. |
| `PERIOD_LABEL = CAST(REPORT_YEAR AS TEXT)` expression | Medium | Same concern as query 4 — expression filter on unindexed expression. |
| `GROUP BY` + `ORDER BY` same columns | Low | Sort is covered by the GROUP BY plan; no extra sort step. |

#### Optimisation candidates

1. **Composite index** `financial_reports("CD_CVM", "REPORT_YEAR")` INCLUDE `("PERIOD_LABEL")` — covers both the IN filter and the expression filter with an index-only scan (Issue #97).

#### Pre-index EXPLAIN ANALYZE

```
-- Paste output here
```

#### Post-index EXPLAIN ANALYZE (after Issue #97)

```
-- Paste output here
```

---

## Summary: remaining optimisations beyond Issue #97

After the indexes from Issue #97 land, the following items are expected to remain:

| Query | Remaining risk | Suggested action |
|---|---|---|
| `get_companies_directory_page` | `COUNT(*)` double-aggregation subquery | Rewrite to `COUNT(DISTINCT c.cd_cvm)` in a single pass; validate pagination counts |
| `get_sector_metric_rows` | Full `financial_reports` scan for 4 account codes (no `CD_CVM` filter) | Add composite `(CD_CONTA, REPORT_YEAR)` index; consider materialised view for sector KPIs if query time stays >500ms |
| Search with `LOWER(company_name) LIKE '%...'` | Leading wildcard — index unusable | Add `pg_trgm` GIN index on `lower(company_name)` if user-facing search latency is noticeable |

## Slow query monitoring

A `@slow_query_warn(threshold_ms=200)` decorator is now active on the 5 target methods in
`src/query_layer.py`. Any query exceeding 200ms will emit a structured WARN log:

```json
{"event": "slow_query", "query": "get_companies_directory_page", "elapsed_ms": 312.4, "threshold_ms": 200.0}
```

These logs are captured by Railway's log drain and can be filtered with:

```
event:slow_query
```
