# LT-0001 Post-refresh Validation

Status: `done`

Data da validacao: `2026-04-12`

## Escopo global recuperado

| Metrica | Valor |
|---|---:|
| Companhias com anual `2025` apos a recarga | `406` |
| Companhias com periodos trimestrais `2025` apos a recarga | `434` |
| Companhias com qualquer dado `2025` apos a recarga | `438` |
| Linhas anuais `2025` no banco | `110313` |
| Refreshes `2025` com `success` | `438` |
| Refreshes `2025` com `no_data` | `11` |
| Companhias no `DFP DRE 2025` processado | `415` |

## Observacao de completude

- O total anual `2025` relevante para cobertura anual ficou em `406`, nao em `415`,
  porque a cobertura anual exige o pacote obrigatorio completo (`BPA`, `BPP`,
  `DRE`, `DFC`) no periodo `2025`, e nao apenas presenca em um CSV isolado.

## Casos alvo

### `17973` - Kroton / Cogna

- `get_available_years(17973)`:
  `[2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]`
- `/companies/17973/years`:
  `200` com `2025` incluido
- `financial_reports` `2025`:
  `1Q25`, `2Q25`, `3Q25`, `4Q25`, `2025`
- DRE `2025`:
  colunas incluem `1Q25`, `2Q25`, `3Q25`, `4Q25`, `2025`

### `21016` - Estacio / YDUQS

- `get_available_years(21016)`:
  `[2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]`
- `/companies/21016/years`:
  `200` com `2025` incluido
- `financial_reports` `2025`:
  `1Q25`, `2Q25`, `3Q25`, `4Q25`, `2025`
- DRE `2025`:
  colunas incluem `1Q25`, `2Q25`, `3Q25`, `4Q25`, `2025`

### `23221` - Ser Educacional

- `get_available_years(23221)`:
  `[2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]`
- `/companies/23221/years`:
  `200` com `2025` incluido
- `financial_reports` `2025`:
  `1Q25`, `2Q25`, `3Q25`, `4Q25`, `2025`
- DRE `2025`:
  colunas incluem `1Q25`, `2Q25`, `3Q25`, `4Q25`, `2025`

## KPI trimestral - nuance de contrato atual

- O bundle de KPIs trimestrais continua entregando o fechamento em `2025`,
  nao em `4Q25`, porque `src/kpi_engine.py` deduplica `Q4` contra o anual.
- A demonstracao contabil continua sendo a referencia certa para validar a
  aparicao explicita de `4Q25`.

## Companhias com `no_data`

- `2W ECOBANK S.A.`
- `BANCO ABC BRASIL S/A`
- `BRADESPAR S/A`
- `CONCEBRA - CONCESSIONARIA DAS RODOVIAS CENTRAIS DO BRASIL S.A.`
- `EDITORA SARAIVA`
- `LET'S RENT A CAR S.A.`
- `LIGGA TELECOMUNICACOES S.A.`
- `POMIFRUTAS S/A`
- `ROSSI RESIDENCIAL S.A. - EM RECUPERACAO JUDICIAL`
- `SANTANENSE`
- `TEKA S.A.`
