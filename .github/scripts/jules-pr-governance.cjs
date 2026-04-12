module.exports = async function runJulesPrGovernance({ github, context, core }) {
  const riskRank = {
    safe: 0,
    shared: 1,
    'contract-sensitive': 2,
  };

  function normalizePath(value) {
    return (value || '')
      .replace(/\\/g, '/')
      .replace(/^\.\//, '')
      .trim();
  }

  function normalizeText(value) {
    return (value || '').trim();
  }

  function unique(values) {
    return [...new Set((values || []).filter(Boolean))];
  }

  function escapeRegexCharacter(character) {
    return /[|\\{}()[\]^$+?.]/.test(character)
      ? `\\${character}`
      : character;
  }

  function escapeForRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function expandBracePatterns(pattern) {
    const openIndex = pattern.indexOf('{');
    if (openIndex === -1) {
      return [pattern];
    }

    let depth = 0;
    let closeIndex = -1;
    for (let index = openIndex; index < pattern.length; index += 1) {
      const current = pattern[index];
      if (current === '{') {
        depth += 1;
      } else if (current === '}') {
        depth -= 1;
        if (depth === 0) {
          closeIndex = index;
          break;
        }
      }
    }

    if (closeIndex === -1) {
      return [pattern];
    }

    const before = pattern.slice(0, openIndex);
    const after = pattern.slice(closeIndex + 1);
    const inner = pattern.slice(openIndex + 1, closeIndex);

    const segments = [];
    let token = '';
    let innerDepth = 0;

    for (const current of inner) {
      if (current === ',' && innerDepth === 0) {
        segments.push(token);
        token = '';
        continue;
      }

      if (current === '{') {
        innerDepth += 1;
      } else if (current === '}') {
        innerDepth -= 1;
      }

      token += current;
    }

    if (token) {
      segments.push(token);
    }

    return segments.flatMap((segment) =>
      expandBracePatterns(`${before}${segment}${after}`),
    );
  }

  function globToRegex(pattern) {
    const normalized = normalizePath(pattern);
    let regex = '^';

    for (let index = 0; index < normalized.length; index += 1) {
      const current = normalized[index];
      const next = normalized[index + 1];

      if (current === '*' && next === '*') {
        regex += '.*';
        index += 1;
        continue;
      }

      if (current === '*') {
        regex += '[^/]*';
        continue;
      }

      if (current === '?') {
        regex += '.';
        continue;
      }

      regex += escapeRegexCharacter(current);
    }

    regex += '$';
    return new RegExp(regex);
  }

  function matchesAnyPattern(file, patterns) {
    const normalizedFile = normalizePath(file);
    return (patterns || []).some((pattern) =>
      expandBracePatterns(pattern).some((expandedPattern) =>
        globToRegex(expandedPattern).test(normalizedFile),
      ),
    );
  }

  function highestRisk(left, right) {
    return riskRank[left] >= riskRank[right] ? left : right;
  }

  function parseNames(labels) {
    return (labels || []).map((label) =>
      typeof label === 'string' ? label : label.name,
    );
  }

  async function ensureLabelDefinition(name, color, description) {
    try {
      await github.rest.issues.createLabel({
        ...context.repo,
        name,
        color,
        description,
      });
    } catch (error) {
      if (error.status !== 422) {
        throw error;
      }
    }
  }

  function hasJulesMarker(body, markers) {
    return (markers || []).some((marker) => normalizeText(body).includes(marker));
  }

  function extractClosesIssueNumbers(body) {
    const matches = [...(body || '').matchAll(/\bCloses\s+#(\d+)\b/gi)];
    return unique(matches.map((match) => Number(match[1])));
  }

  function stripClosesLines(body) {
    return (body || '')
      .replace(/^\s*Closes\s+#\d+\s*$/gim, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function upsertCloses(body, issueNumber) {
    const current = stripClosesLines(body);
    return current ? `Closes #${issueNumber}\n\n${current}` : `Closes #${issueNumber}`;
  }

  function buildSourceMarker(prefix, prNumber) {
    return `${prefix}${prNumber} -->`;
  }

  function findSourceIssueMatches(issues, sourceMarker, prNumber) {
    return (issues || []).filter((issue) => {
      if (issue.pull_request) {
        return false;
      }

      const body = issue.body || '';
      if (body.includes(sourceMarker)) {
        return true;
      }

      const sourceSectionMatch = body.match(
        /^## Source PR\r?\n([\s\S]*?)(?:\r?\n## |\s*$)/im,
      );
      if (!sourceSectionMatch) {
        return false;
      }

      return new RegExp(`#${prNumber}\\b`).test(sourceSectionMatch[1]);
    });
  }

  function formatWriteSet(files) {
    return (files || []).map((file) => `- ${file}`).join('\n');
  }

  function buildChecklist() {
    return [
      '- [ ] Intake automatica reconciliada com a PR',
      '- [ ] Owner, lane, workspace, Source PR, write-set e risco revisados',
      '- [ ] Implementacao concluida',
      '- [ ] Validacao executada',
      '- [ ] Issue/docs atualizados',
      '- [ ] PR mergeada e issue fechada',
    ].join('\n');
  }

  function buildAcceptanceCriteria(blocked) {
    const lines = [
      '- A PR do Jules fica vinculada a esta task via `Closes #<issue>`.',
      '- Lane, risco, workspace especial, Source PR e write-set ficam sincronizados com o estado atual da PR.',
      '- O restante da validacao e da revisao segue o fluxo padrao do repositorio.',
    ];

    if (blocked) {
      lines.push('- A task permanece bloqueada ate a triagem humana corrigir a ambiguidade ou o domain mix.');
    }

    return lines.join('\n');
  }

  function buildValidationExpectations(summary) {
    const lines = [
      '- Validar o workflow `Jules PR Governance`.',
      '- Confirmar a issue vinculada e o `Closes #<issue>` na PR.',
    ];

    if (summary.requiresCompatibility) {
      lines.push('- Revisar compatibilidade porque o write-set toca `critical-contract`.');
    }

    if (summary.blocked) {
      lines.push(`- Executar triagem humana: ${summary.failureReason}`);
    }

    return lines.join('\n');
  }

  function composeManagedIssueBlock({
    pr,
    config,
    summary,
    area,
    priorityLabel,
  }) {
    const sourceMarker = buildSourceMarker(config.issueSourceMarkerPrefix, pr.number);
    const sourcePrValue = `#${pr.number} (${pr.html_url})`;
    const workspace = `${config.workspacePrefix}${pr.number}`;
    const writeSet = formatWriteSet(summary.files);
    const coordination = summary.blocked
      ? `Triagem humana obrigatoria: ${summary.failureReason}`
      : 'Intake automatica do Jules reconciliada pelo workflow dedicado.';
    const contextText = summary.blocked
      ? `PR do Jules aberta em ${pr.html_url}. A intake automatica criou ou reconciliou a task retroativa, mas a PR permanece bloqueada ate triagem humana porque ${summary.failureReason}`
      : `PR do Jules aberta em ${pr.html_url}. Esta task retroativa foi criada ou reconciliada automaticamente para regularizar a governanca PR-first do Jules.`;
    const compatibilityText = summary.requiresCompatibility
      ? 'A PR toca `critical-contract` e exige revisao humana de compatibilidade antes do merge.'
      : 'n/a';

    return [
      config.issueManagedStart,
      sourceMarker,
      '## Epic pai',
      'n/a',
      '',
      '## Task mae',
      'n/a',
      '',
      '## Owner atual',
      config.defaultOwner,
      '',
      '## Lane oficial',
      summary.lane,
      '',
      '## Lane solicitante',
      'n/a',
      '',
      '## Workspace da task',
      workspace,
      '',
      '## Source PR',
      sourcePrValue,
      '',
      '## Write-set esperado',
      writeSet,
      '',
      '## Classificacao de risco',
      summary.risk,
      '',
      '## Dependencias ou write-sets concorrentes',
      coordination,
      '',
      '## Tasks filhas',
      '- nenhuma registrada',
      '',
      '## Criterio de consumo',
      'n/a',
      '',
      '## Contexto',
      contextText,
      '',
      '## Criterios de aceite',
      buildAcceptanceCriteria(summary.blocked),
      '',
      '## Area principal',
      area,
      '',
      '## Prioridade',
      priorityLabel.replace(/^priority:/, ''),
      '',
      '## Checklist de execucao',
      buildChecklist(),
      '',
      '## Validacao esperada',
      buildValidationExpectations(summary),
      '',
      '## Compatibilidade',
      compatibilityText,
      config.issueManagedEnd,
    ].join('\n');
  }

  function upsertManagedIssueBody(existingBody, managedBlock, config) {
    const start = config.issueManagedStart;
    const end = config.issueManagedEnd;
    const body = normalizeText(existingBody);

    if (body.includes(start) && body.includes(end)) {
      const pattern = new RegExp(
        `${escapeForRegex(start)}[\\s\\S]*?${escapeForRegex(end)}`,
      );
      return body.replace(pattern, managedBlock).trim();
    }

    if (!body) {
      return managedBlock;
    }

    return [
      managedBlock,
      '',
      '## Notas manuais preservadas',
      body,
    ].join('\n').trim();
  }

  function buildCommentBody({
    config,
    pr,
    summary,
    issueNumber,
    statusLabel,
  }) {
    const statusLine = summary.blocked ? 'bloqueada' : 'ativa';
    const draftLine = summary.shouldForceDraft
      ? 'A PR foi mantida em draft porque a intake ainda nao esta valida ou porque o write-set exige draft.'
      : 'A intake esta valida. Se a PR continuar em draft, isso passa a ser decisao humana do fluxo normal.';

    const bullets = [
      `Status da intake: \`${statusLine}\``,
      `Issue vinculada: #${issueNumber}`,
      `Lane inferida: \`${summary.lane}\``,
      `Risco inferido: \`risk:${summary.risk}\``,
      `Workspace registrado: \`${config.workspacePrefix}${pr.number}\``,
      `Label persistente aplicado: \`${config.sourceLabel}\``,
      `Status label da issue: \`${statusLabel}\``,
      draftLine,
    ];

    if (summary.blocked) {
      bullets.push(`Bloqueio: ${summary.failureReason}`);
      bullets.push('Acao necessaria: triagem humana para ajustar paths, lane, risco ou quebrar a PR em escopos validos.');
    } else {
      bullets.push('Fluxo normal: a task retroativa esta regularizada e a PR pode seguir review/validacao sem relaxar os guardrails humanos.');
    }

    if (summary.requiresCompatibility) {
      bullets.push('Atencao: o write-set toca `critical-contract`; compatibilidade deve ser revisada manualmente antes do merge.');
    }

    return [
      config.commentMarker,
      '## Jules Governance Intake',
      '',
      ...bullets.map((line) => `- ${line}`),
    ].join('\n');
  }

  async function upsertStickyComment(issueNumber, body, marker) {
    const comments = await github.paginate(github.rest.issues.listComments, {
      ...context.repo,
      issue_number: issueNumber,
      per_page: 100,
    });

    const existing = comments.find((comment) =>
      typeof comment.body === 'string' && comment.body.includes(marker),
    );

    if (existing) {
      await github.rest.issues.updateComment({
        ...context.repo,
        comment_id: existing.id,
        body,
      });
      return;
    }

    await github.rest.issues.createComment({
      ...context.repo,
      issue_number: issueNumber,
      body,
    });
  }

  async function convertPrToDraft(nodeId) {
    await github.graphql(
      `
        mutation ConvertPullRequestToDraft($pullRequestId: ID!) {
          convertPullRequestToDraft(input: { pullRequestId: $pullRequestId }) {
            pullRequest {
              id
              isDraft
            }
          }
        }
      `,
      {
        pullRequestId: nodeId,
      },
    );
  }

  function inferArea(summary, config) {
    if (summary.lane !== 'backend') {
      return config.areaByLane[summary.lane] || 'infra';
    }

    return summary.files.some((file) => matchesAnyPattern(file, config.backendAreaPatterns))
      ? 'api'
      : 'core';
  }

  function inferLaneAndRisk(files, policy) {
    const laneNames = Object.keys(policy.laneAllowlists || {});
    const candidateScores = Object.fromEntries(laneNames.map((lane) => [lane, 0]));
    const ownerHints = Object.fromEntries(laneNames.map((lane) => [lane, 0]));
    let laneCandidates = [...laneNames];
    let risk = 'safe';
    let requiresDraft = false;
    let requiresCompatibility = false;
    let failureReason = '';

    if (files.length === 0) {
      return {
        blocked: true,
        lane: policy.julesIntake.fallbackLane,
        risk,
        requiresDraft: true,
        requiresCompatibility,
        failureReason: 'a PR nao possui arquivos alterados.',
      };
    }

    for (const file of files) {
      const matchedGroups = (policy.criticalGroups || []).filter((group) =>
        matchesAnyPattern(file, group.patterns),
      );

      if (matchedGroups.length > 1) {
        failureReason = `o arquivo "${file}" caiu em mais de um grupo critico na path policy.`;
        break;
      }

      let allowedLanes = [];
      if (matchedGroups.length === 1) {
        const [group] = matchedGroups;
        allowedLanes = group.allowedLanes || [];
        risk = highestRisk(risk, group.minimumRisk || 'safe');
        requiresDraft = requiresDraft || Boolean(group.requireDraft);
        requiresCompatibility =
          requiresCompatibility || Boolean(group.requireCompatibility);
        if (group.ownerLane && allowedLanes.includes(group.ownerLane)) {
          ownerHints[group.ownerLane] += 1;
        }
      } else {
        allowedLanes = laneNames.filter((lane) =>
          matchesAnyPattern(file, policy.laneAllowlists[lane]),
        );
      }

      if (allowedLanes.length === 0) {
        failureReason = `o arquivo "${file}" nao esta classificado em .github/guardrails/path-policy.json.`;
        break;
      }

      if (allowedLanes.length === 1) {
        candidateScores[allowedLanes[0]] += 1;
      }

      laneCandidates = laneCandidates.filter((lane) => allowedLanes.includes(lane));
      if (laneCandidates.length === 0) {
        failureReason = 'os paths alterados nao convergem para uma lane unica valida.';
        break;
      }
    }

    const blockingMix = (policy.disallowedDomainMixes || []).find((mix) => {
      const leftTouched = files.some((file) => matchesAnyPattern(file, mix.left));
      const rightTouched = files.some((file) => matchesAnyPattern(file, mix.right));
      return leftTouched && rightTouched;
    });

    if (blockingMix) {
      failureReason = `a PR mistura dominios proibidos pelo guardrail "${blockingMix.name}".`;
    }

    let lane = policy.julesIntake.fallbackLane;
    if (!failureReason) {
      if (laneCandidates.length === 1) {
        lane = laneCandidates[0];
      } else {
        const hintedCandidates = laneCandidates.filter(
          (candidate) =>
            candidateScores[candidate] > 0 || ownerHints[candidate] > 0,
        );

        if (hintedCandidates.length === 1) {
          lane = hintedCandidates[0];
        } else if (
          hintedCandidates.length === 0 &&
          laneCandidates.includes(policy.julesIntake.fallbackLane)
        ) {
          lane = policy.julesIntake.fallbackLane;
        } else {
          failureReason = `a inferencia de lane ficou ambigua entre: ${laneCandidates.join(', ')}.`;
        }
      }
    }

    if (failureReason) {
      lane = policy.julesIntake.fallbackLane;
    }

    return {
      blocked: Boolean(failureReason),
      lane,
      risk,
      requiresDraft,
      requiresCompatibility,
      failureReason,
    };
  }

  const pr = context.payload.pull_request;
  const prLabels = parseNames(pr.labels);
  const { data: policyFile } = await github.rest.repos.getContent({
    ...context.repo,
    path: '.github/guardrails/path-policy.json',
    ref: pr.base.sha,
  });
  const policy = JSON.parse(
    Buffer.from(policyFile.content, policyFile.encoding).toString('utf8'),
  );
  const config = policy.julesIntake;
  const isJulesPr =
    prLabels.includes(config.sourceLabel) ||
    hasJulesMarker(pr.body || '', config.bodyMarkers || []);

  if (!isJulesPr) {
    core.info(`PR #${pr.number} nao corresponde ao intake do Jules. Workflow ignorado.`);
    return;
  }

  await ensureLabelDefinition(
    config.sourceLabel,
    '7057ff',
    'PR or task created automatically by Jules',
  );

  const changedFiles = await github.paginate(github.rest.pulls.listFiles, {
    ...context.repo,
    pull_number: pr.number,
    per_page: 100,
  });
  const files = unique(
    changedFiles
      .map((file) => normalizePath(file.filename))
      .filter(Boolean),
  ).sort();
  const summary = inferLaneAndRisk(files, policy);
  summary.files = files;
  summary.shouldForceDraft = summary.blocked || summary.requiresDraft;

  const area = inferArea(summary, config);
  const priorityLabel = `priority:${config.defaultPriority}`;
  const linkedIssueNumbers = extractClosesIssueNumbers(pr.body || '');

  if (linkedIssueNumbers.length > 1) {
    summary.blocked = true;
    summary.failureReason = `a PR referencia mais de uma issue em \`Closes #...\`: ${linkedIssueNumbers
      .map((issueNumber) => `#${issueNumber}`)
      .join(', ')}.`;
    summary.shouldForceDraft = true;
  }

  const sourceMarker = buildSourceMarker(config.issueSourceMarkerPrefix, pr.number);
  const allIssues = await github.paginate(github.rest.issues.listForRepo, {
    ...context.repo,
    state: 'all',
    per_page: 100,
  });
  const sourceMatches = findSourceIssueMatches(allIssues, sourceMarker, pr.number);

  if (sourceMatches.length > 1) {
    summary.blocked = true;
    summary.failureReason = `existem multiplas issues vinculadas a esta Source PR: ${sourceMatches
      .map((issue) => `#${issue.number}`)
      .join(', ')}.`;
    summary.shouldForceDraft = true;
  }

  let targetIssue = null;
  if (linkedIssueNumbers.length === 1) {
    const issueNumber = linkedIssueNumbers[0];
    const { data: linkedIssue } = await github.rest.issues.get({
      ...context.repo,
      issue_number: issueNumber,
    });

    if (linkedIssue.pull_request) {
      summary.blocked = true;
      summary.failureReason = `#${issueNumber} e uma pull request, nao uma task issue.`;
      summary.shouldForceDraft = true;
    } else {
      const linkedLabels = parseNames(linkedIssue.labels);
      const linkedBody = linkedIssue.body || '';
      const linkedLooksManaged =
        linkedLabels.includes('kind:task') ||
        linkedLabels.includes(config.sourceLabel) ||
        linkedBody.includes(sourceMarker);

      if (!linkedLooksManaged) {
        summary.blocked = true;
        summary.failureReason = `#${issueNumber} ja esta vinculada na PR, mas nao parece ser uma task retroativa do Jules.`;
        summary.shouldForceDraft = true;
      } else {
        targetIssue = linkedIssue;
      }
    }
  }

  if (!targetIssue && sourceMatches.length === 1) {
    targetIssue = sourceMatches[0];
  }

  if (!targetIssue && sourceMatches.length > 1) {
    targetIssue = sourceMatches[0];
  }

  const statusLabel = summary.blocked ? config.blockedStatus : config.defaultStatus;

  const nextIssueBody = composeManagedIssueBlock({
    pr,
    config,
    summary,
    area,
    priorityLabel,
  });
  const nextIssueLabels = unique([
    'kind:task',
    statusLabel,
    priorityLabel,
    `area:${area}`,
    `risk:${summary.risk}`,
    `lane:${summary.lane}`,
    config.sourceLabel,
  ]);

  if (!targetIssue) {
    const createResponse = await github.rest.issues.create({
      ...context.repo,
      title: `[Task] Intake Jules PR #${pr.number} - ${pr.title}`,
      body: nextIssueBody,
      labels: nextIssueLabels,
    });
    targetIssue = createResponse.data;
  } else {
    const issueLabels = parseNames(targetIssue.labels);
    const preservedLabels = issueLabels.filter((label) => {
      if (label === 'automation:jules' || label === config.sourceLabel) {
        return false;
      }

      return !['status:', 'priority:', 'area:', 'risk:', 'lane:'].some((prefix) =>
        label.startsWith(prefix),
      );
    });

    await github.rest.issues.update({
      ...context.repo,
      issue_number: targetIssue.number,
      state: 'open',
      body: upsertManagedIssueBody(targetIssue.body || '', nextIssueBody, config),
    });

    await github.rest.issues.setLabels({
      ...context.repo,
      issue_number: targetIssue.number,
      labels: unique([...preservedLabels, ...nextIssueLabels]),
    });

    if (issueLabels.includes('automation:jules')) {
      await github.rest.issues.removeLabel({
        ...context.repo,
        issue_number: targetIssue.number,
        name: 'automation:jules',
      }).catch((error) => {
        if (error.status !== 404) {
          throw error;
        }
      });
    }
  }

  await github.rest.issues.addLabels({
    ...context.repo,
    issue_number: pr.number,
    labels: [config.sourceLabel],
  });

  if (prLabels.includes('automation:jules')) {
    await github.rest.issues.removeLabel({
      ...context.repo,
      issue_number: pr.number,
      name: 'automation:jules',
    }).catch((error) => {
      if (error.status !== 404) {
        throw error;
      }
    });
  }

  const desiredPrBody = upsertCloses(pr.body || '', targetIssue.number);
  if (desiredPrBody !== normalizeText(pr.body || '')) {
    await github.rest.pulls.update({
      ...context.repo,
      pull_number: pr.number,
      body: desiredPrBody,
    });
  }

  if (summary.shouldForceDraft && !pr.draft) {
    await convertPrToDraft(pr.node_id);
  }

  const commentBody = buildCommentBody({
    config,
    pr,
    summary,
    issueNumber: targetIssue.number,
    statusLabel,
  });
  await upsertStickyComment(pr.number, commentBody, config.commentMarker);

  if (summary.blocked) {
    core.setFailed(
      `Jules intake bloqueada para PR #${pr.number}: ${summary.failureReason} Triagem humana obrigatoria.`,
    );
  }
};
