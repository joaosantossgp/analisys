param(
  [Parameter(Mandatory = $true)]
  [int]$Pr,

  [string]$Repo = "",

  [string]$Owner = "Jules (Google Labs)",

  [ValidateSet("p0", "p1", "p2", "p3")]
  [string]$Priority = "p1"
)

$ErrorActionPreference = "Stop"

function Normalize-PathValue {
  param([string]$Value)

  if ($null -eq $Value) {
    return ""
  }

  return (($Value -replace "\\", "/").Trim())
}

function Convert-GlobToRegex {
  param([string]$Pattern)

  $normalized = Normalize-PathValue $Pattern
  $builder = New-Object System.Text.StringBuilder
  [void]$builder.Append("^")

  for ($index = 0; $index -lt $normalized.Length; $index += 1) {
    $current = $normalized[$index]
    $next = if ($index + 1 -lt $normalized.Length) { $normalized[$index + 1] } else { [char]0 }

    if ($current -eq "*" -and $next -eq "*") {
      [void]$builder.Append(".*")
      $index += 1
      continue
    }

    if ($current -eq "*") {
      [void]$builder.Append("[^/]*")
      continue
    }

    if ($current -eq "?") {
      [void]$builder.Append(".")
      continue
    }

    [void]$builder.Append([regex]::Escape([string]$current))
  }

  [void]$builder.Append("$")
  return $builder.ToString()
}

function Test-AnyPatternMatch {
  param(
    [string]$Path,
    [object[]]$Patterns
  )

  $normalizedPath = Normalize-PathValue $Path
  foreach ($pattern in $Patterns) {
    if ($normalizedPath -match (Convert-GlobToRegex -Pattern ([string]$pattern))) {
      return $true
    }
  }

  return $false
}

function Ensure-Label {
  param(
    [string]$RepoName,
    [string]$Name,
    [string]$Color,
    [string]$Description
  )

  gh label create $Name --repo $RepoName --color $Color --description $Description --force | Out-Null
}

function Test-IsJulesLogin {
  param(
    [string]$Login,
    [string]$ConfiguredLogin
  )

  $normalized = Normalize-PathValue $Login
  if (-not $normalized) {
    return $false
  }

  $normalized = $normalized.ToLowerInvariant()
  $configured = Normalize-PathValue $ConfiguredLogin

  if ($configured) {
    return $normalized -eq $configured.ToLowerInvariant()
  }

  return $normalized.Contains("jules") -and $normalized.EndsWith("[bot]")
}

function Get-RepoName {
  param([string]$ExplicitRepo)

  if ($ExplicitRepo) {
    return $ExplicitRepo
  }

  $name = gh repo view --json nameWithOwner --jq .nameWithOwner
  if (-not $name) {
    throw "Nao foi possivel determinar o repositorio atual."
  }

  return $name.Trim()
}

function Get-AreaForLane {
  param(
    [string]$Lane,
    [string[]]$Files
  )

  switch ($Lane) {
    "frontend" { return "web" }
    "ops-quality" { return "infra" }
    "backend" {
      if ($Files | Where-Object { $_ -like "apps/api/**" -or $_ -eq "docs/V2_API_CONTRACT.md" }) {
        return "api"
      }

      return "core"
    }
  }

  throw "Lane nao suportada para area: $Lane"
}

function Get-RiskRank {
  param([string]$Risk)

  switch ($Risk) {
    "safe" { return 0 }
    "shared" { return 1 }
    "contract-sensitive" { return 2 }
  }

  throw "Risco nao suportado: $Risk"
}

function Get-HigherRisk {
  param(
    [string]$Current,
    [string]$Candidate
  )

  if ((Get-RiskRank -Risk $Candidate) -gt (Get-RiskRank -Risk $Current)) {
    return $Candidate
  }

  return $Current
}

$repoName = Get-RepoName -ExplicitRepo $Repo

$labelDefinitions = @(
  @{ Name = "kind:task"; Color = "0e8a16"; Description = "Executable task issue" }
  @{ Name = "status:in-progress"; Color = "fbca04"; Description = "Work in progress" }
  @{ Name = "priority:p0"; Color = "b60205"; Description = "Highest priority" }
  @{ Name = "priority:p1"; Color = "d93f0b"; Description = "High priority" }
  @{ Name = "priority:p2"; Color = "fbca04"; Description = "Medium priority" }
  @{ Name = "priority:p3"; Color = "0e8a16"; Description = "Lower priority" }
  @{ Name = "area:web"; Color = "1d76db"; Description = "Web app area" }
  @{ Name = "area:api"; Color = "0052cc"; Description = "API area" }
  @{ Name = "area:core"; Color = "5319e7"; Description = "Core Python area" }
  @{ Name = "area:infra"; Color = "c2e0c6"; Description = "Infra and automation area" }
  @{ Name = "risk:safe"; Color = "0e8a16"; Description = "Isolated write-set" }
  @{ Name = "risk:shared"; Color = "fbca04"; Description = "Touches shared governance or critical files" }
  @{ Name = "risk:contract-sensitive"; Color = "b60205"; Description = "Touches public contracts" }
  @{ Name = "lane:frontend"; Color = "1d76db"; Description = "Frontend lane" }
  @{ Name = "lane:backend"; Color = "5319e7"; Description = "Backend lane" }
  @{ Name = "lane:ops-quality"; Color = "0052cc"; Description = "Ops-quality lane" }
  @{ Name = "automation:jules"; Color = "7057ff"; Description = "Jules-specific governance and automation" }
)

foreach ($label in $labelDefinitions) {
  Ensure-Label -RepoName $repoName -Name $label.Name -Color $label.Color -Description $label.Description
}

$prJson = gh pr view $Pr --repo $repoName --json number,title,body,url,author,files
if (-not $prJson) {
  throw "Nao foi possivel ler a PR #$Pr."
}

$prData = $prJson | ConvertFrom-Json
$prBody = if ($null -eq $prData.body) { "" } else { [string]$prData.body }
$configuredJulesLogin = ""
$variableJson = gh api "repos/$repoName/actions/variables/JULES_GITHUB_LOGIN" 2>$null
if ($LASTEXITCODE -eq 0 -and $variableJson) {
  $variableData = $variableJson | ConvertFrom-Json
  if ($null -ne $variableData.value) {
    $configuredJulesLogin = [string]$variableData.value
  }
}

$prAuthorLogin = ""
if ($null -ne $prData.author -and $null -ne $prData.author.login) {
  $prAuthorLogin = [string]$prData.author.login
}

if (-not (Test-IsJulesLogin -Login $prAuthorLogin -ConfiguredLogin $configuredJulesLogin)) {
  throw "A PR #$Pr nao parece ter sido publicada pelo Jules. Autor encontrado: '$prAuthorLogin'."
}

$linkedIssueMatch = [regex]::Match($prBody, '(?im)\bCloses\s+#(\d+)\b')
if ($linkedIssueMatch.Success) {
  gh pr edit $Pr --repo $repoName --add-label "automation:jules" | Out-Null
  Write-Output "PR #$Pr ja esta vinculada a issue #$($linkedIssueMatch.Groups[1].Value)."
  exit 0
}

$policyPath = Join-Path $PSScriptRoot "..\\.github\\guardrails\\path-policy.json"
$policy = Get-Content -Raw $policyPath | ConvertFrom-Json

$files = @($prData.files | ForEach-Object { Normalize-PathValue $_.path }) | Where-Object { $_ }
if (-not $files -or $files.Count -eq 0) {
  throw "A PR #$Pr nao possui arquivos alterados."
}

$laneCandidates = @("frontend", "backend", "ops-quality")
$ownerLaneHints = New-Object System.Collections.Generic.List[string]
$minimumRisk = "safe"

foreach ($file in $files) {
  $matchedGroups = @($policy.criticalGroups | Where-Object { Test-AnyPatternMatch -Path $file -Patterns $_.patterns })
  if ($matchedGroups.Count -gt 1) {
    throw "O arquivo '$file' caiu em mais de um grupo critico."
  }

  if ($matchedGroups.Count -eq 1) {
    $group = $matchedGroups[0]
    $allowedLanes = @($group.allowedLanes)
    $minimumRisk = Get-HigherRisk -Current $minimumRisk -Candidate $group.minimumRisk
    $ownerLaneHints.Add($group.ownerLane) | Out-Null
  } else {
    $allowedLanes = @()
    foreach ($laneProperty in $policy.laneAllowlists.PSObject.Properties) {
      if (Test-AnyPatternMatch -Path $file -Patterns $laneProperty.Value) {
        $allowedLanes += $laneProperty.Name
      }
    }

    if ($allowedLanes.Count -eq 0) {
      throw "O arquivo '$file' nao esta classificado em .github/guardrails/path-policy.json."
    }

    if ($allowedLanes.Count -eq 1) {
      $ownerLaneHints.Add($allowedLanes[0]) | Out-Null
    }
  }

  $laneCandidates = @($laneCandidates | Where-Object { $allowedLanes -contains $_ })
  if ($laneCandidates.Count -eq 0) {
    throw "Os arquivos alterados misturam lanes incompatíveis para a governanca atual."
  }
}

if ($laneCandidates.Count -eq 1) {
  $lane = $laneCandidates[0]
} else {
  $uniqueHints = @($ownerLaneHints | Sort-Object -Unique | Where-Object { $laneCandidates -contains $_ })
  if ($uniqueHints.Count -eq 1) {
    $lane = $uniqueHints[0]
  } else {
    throw "Nao foi possivel inferir uma unica lane para a PR #$Pr. Lanes candidatas: $($laneCandidates -join ', ')."
  }
}

$area = Get-AreaForLane -Lane $lane -Files $files
$workspace = "jules://github/pr/$Pr"
$risk = $minimumRisk
$issueTitle = "[Task] Register Jules PR #$Pr - $($prData.title)"
$writeSetLines = ($files | Sort-Object | ForEach-Object { "- $_" }) -join "`n"

$issueBody = @"
## Epic pai
n/a

## Task mae
n/a

## Owner atual
$Owner

## Lane oficial
$lane

## Lane solicitante
n/a

## Workspace da task
$workspace

## Write-set esperado
$writeSetLines

## Classificacao de risco
$risk

## Dependencias ou write-sets concorrentes
PR-first permitido apenas porque a autoria e do Jules.

## Tasks filhas
- nenhuma registrada

## Criterio de consumo
n/a

## Contexto
PR do Jules aberta em $($prData.url). Esta task retroativa formaliza a governanca exigida pelo repositorio depois que a PR ja existe.

## Criterios de aceite
- A PR do Jules fica vinculada a esta task com `Closes #<issue>`.
- Lane, risco, workspace especial do Jules e write-set ficam registrados.
- O restante da validacao e da revisao segue o fluxo padrao do repositorio.

## Area principal
$area

## Prioridade
$Priority

## Checklist de execucao
- [ ] Escopo confirmado
- [ ] Owner, lane, workspace, write-set e risco revisados
- [ ] Viculos de task mae/tasks filhas/consumo atualizados quando aplicavel
- [ ] Implementacao concluida
- [ ] Validacao executada
- [ ] Issue/docs atualizados
- [ ] PR mergeada e issue fechada

## Validacao esperada
- Revisar a PR do Jules.
- Executar os checks relevantes para os arquivos alterados.
- Confirmar que a PR referencia esta issue com `Closes #<issue>`.
"@

$issueUrl = gh issue create --repo $repoName --title $issueTitle --body $issueBody --label "kind:task" --label "status:in-progress" --label "priority:$Priority" --label "area:$area" --label "risk:$risk" --label "lane:$lane" --label "automation:jules"
if (-not $issueUrl) {
  throw "Nao foi possivel criar a task retroativa para a PR #$Pr."
}

$issueNumberMatch = [regex]::Match($issueUrl, '/issues/(\d+)$')
if (-not $issueNumberMatch.Success) {
  throw "Nao foi possivel extrair o numero da issue criada a partir de '$issueUrl'."
}

$issueNumber = $issueNumberMatch.Groups[1].Value
$existingBody = $prBody
$newBody = if ([string]::IsNullOrWhiteSpace($existingBody)) {
  "Closes #$issueNumber"
} else {
  "Closes #$issueNumber`n`n$existingBody"
}

gh pr edit $Pr --repo $repoName --body $newBody --add-label "automation:jules" | Out-Null
gh pr comment $Pr --repo $repoName --body "Task retroativa criada para esta PR do Jules: #$issueNumber. A governanca agora segue o fluxo normal do repositorio." | Out-Null

Write-Output "ISSUE_URL=$issueUrl"
Write-Output "ISSUE_NUMBER=$issueNumber"
Write-Output "INFERRED_LANE=$lane"
Write-Output "INFERRED_RISK=$risk"
Write-Output "WORKSPACE=$workspace"
