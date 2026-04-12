# LT-0001 Evidence Matrix

Data de corte da investigacao: `2026-04-12`

## Baseline local

| Metrica | Valor |
|---|---:|
| Companhias distintas no banco | `449` |
| Companhias com qualquer dado `2025` | `431` |
| Companhias com periodos trimestrais `2025` | `431` |
| Companhias com periodo anual `2025` | `0` |
| Companhias que o planner reenfileira para `2025` apos a correcao | `449` |

## Matriz por companhia critica

| CD_CVM | Companhia de referencia | Anuais locais | Periodos locais `2025` antes do refresh | DFP 2025 oficial | Evidencia RI |
|---|---|---|---|---|---|
| `17973` | Kroton / Cogna | `2010-2024` | `1Q25`, `2Q25`, `3Q25` | Presente | RI Cogna bloqueado neste ambiente; CVM ja basta como referencia canonica |
| `21016` | Estacio / YDUQS | `2010-2024` | `1Q25`, `2Q25`, `3Q25` | Presente | [YDUQS RI](https://www.yduqs.com.br/) exibe `4T25` na Central de Resultados |
| `23221` | Ser Educacional | `2010-2024` | `1Q25`, `2Q25`, `3Q25` | Presente | [Ser RI](https://ri.sereducacional.com/) exibe `4T25`, release e demonstracoes financeiras |

## Evidencia de fonte

- CVM DFP oficial:
  [dfp_cia_aberta_2025.zip](https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/DFP/DADOS/dfp_cia_aberta_2025.zip)
- CVM ITR oficial:
  [itr_cia_aberta_2025.zip](https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/ITR/DADOS/itr_cia_aberta_2025.zip)
- Conjunto de dados DFP:
  [Portal Dados Abertos CVM - DFP](https://dados.cvm.gov.br/dataset/cia_aberta-doc-dfp)
- Ser Educacional RI:
  [Homepage RI Ser Educacional](https://ri.sereducacional.com/)
- YDUQS RI:
  [Homepage RI YDUQS](https://www.yduqs.com.br/)

## Observacoes tecnicas

- O contrato de leitura atual ja e anual-only:
  `src/query_layer.py` filtra `PERIOD_LABEL = CAST(REPORT_YEAR AS TEXT)` em `get_available_years` e `get_company_years_map`.
- A falha estava no planner e no cache:
  - ZIP local `data/input/raw/dfp_cia_aberta_2025.zip` obsoleto e muito menor que o oficial.
  - `src/refresh_service.py` aceitava o pacote obrigatorio em qualquer `PERIOD_LABEL`, o que deixava `2025` trimestral como "completo".
