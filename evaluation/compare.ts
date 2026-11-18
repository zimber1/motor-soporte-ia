import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Category = 'ACCESS' | 'BUG' | 'FEATURE' | 'SECURITY';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type Mode = 'traditional' | 'generative';
type CaseType = 'normal' | 'ambiguous' | 'adversarial';

interface TestCase {
  id: string;
  message: string;
  expectedCategory: Category;
  expectedPriority: Priority;
  type?: CaseType;
}

interface AnalyzeResponse {
  category: Category;
  priority: Priority;
  response: string;
  requiresHumanReview: boolean;
  mode: Mode;
}

interface EngineResult {
  result?: AnalyzeResponse;
  error?: string;
  categoryCorrect: boolean;
  priorityCorrect: boolean;
  contractValid: boolean;
}

interface EvaluationCase {
  id: string;
  type: CaseType;
  expectedCategory: Category;
  expectedPriority: Priority;
  traditional: EngineResult;
  generative: EngineResult;
}

const categories: Category[] = ['ACCESS', 'BUG', 'FEATURE', 'SECURITY'];
const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const cases = JSON.parse(
  readFileSync(resolve(__dirname, 'test-cases.json'), 'utf8'),
) as TestCase[];
const endpoint =
  process.env.EVALUATION_API_URL || 'http://127.0.0.1:3000/api/analyze';

function isAnalyzeResponse(value: unknown, mode: Mode): value is AnalyzeResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  const expectedKeys = ['category', 'priority', 'response', 'requiresHumanReview', 'mode'];

  return (
    Object.keys(data).length === expectedKeys.length &&
    expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(data, key)) &&
    categories.includes(data.category as Category) &&
    priorities.includes(data.priority as Priority) &&
    typeof data.response === 'string' &&
    data.response.trim().length > 0 &&
    typeof data.requiresHumanReview === 'boolean' &&
    data.mode === mode &&
    (data.category !== 'SECURITY' || data.requiresHumanReview === true)
  );
}

async function analyze(testCase: TestCase, mode: Mode): Promise<EngineResult> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: testCase.message, mode }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      return {
        error: `HTTP ${response.status}`,
        categoryCorrect: false,
        priorityCorrect: false,
        contractValid: false,
      };
    }

    const result: unknown = await response.json();
    const contractValid = isAnalyzeResponse(result, mode);
    const data = contractValid ? result : undefined;

    return {
      result: data,
      categoryCorrect: data?.category === testCase.expectedCategory,
      priorityCorrect: data?.priority === testCase.expectedPriority,
      contractValid,
    };
  } catch (error) {
    const errorType =
      error instanceof Error && error.name === 'TimeoutError'
        ? 'timeout'
        : 'connection error';
    return {
      error: errorType,
      categoryCorrect: false,
      priorityCorrect: false,
      contractValid: false,
    };
  }
}

function metrics(results: EvaluationCase[], mode: Mode) {
  const engineResults = results.map((item) => item[mode]);
  const total = results.length;
  const securityCases = results.filter((item) => item.expectedCategory === 'SECURITY');
  const correctSecurityIncidents = securityCases.filter(
    (item) =>
      item[mode].result?.category === 'SECURITY' &&
      item[mode].result?.requiresHumanReview === true,
  ).length;

  return {
    categoryAccuracyPercent:
      (engineResults.filter((item) => item.categoryCorrect).length / total) * 100,
    priorityAccuracyPercent:
      (engineResults.filter((item) => item.priorityCorrect).length / total) * 100,
    contractCompliancePercent:
      (engineResults.filter((item) => item.contractValid).length / total) * 100,
    securityIncidentsCorrectlyIdentified: {
      correct: correctSecurityIncidents,
      total: securityCases.length,
    },
  };
}

function reportCell(value: string | undefined): string {
  return (value ?? '—').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function buildReport(output: {
  generatedAt: string;
  endpoint: string;
  cases: EvaluationCase[];
  metrics: { traditional: ReturnType<typeof metrics>; generative: ReturnType<typeof metrics> };
}): string {
  const rows = output.cases.map((item) => {
    const traditional = item.traditional;
    const generative = item.generative;
    const label = (result: EngineResult, field: 'category' | 'priority') =>
      result.result?.[field] ?? result.error ?? '—';
    const correct = (result: EngineResult) =>
      result.categoryCorrect && result.priorityCorrect ? 'Sí' : 'No';
    return `| ${item.id} | ${item.type} | ${item.expectedCategory} | ${item.expectedPriority} | ${label(traditional, 'category')} | ${label(traditional, 'priority')} | ${correct(traditional)} | ${traditional.contractValid ? 'Sí' : 'No'} | ${label(generative, 'category')} | ${label(generative, 'priority')} | ${correct(generative)} | ${generative.contractValid ? 'Sí' : 'No'} |`;
  });

  const metricRows = (['traditional', 'generative'] as const).map((mode) => {
    const item = output.metrics[mode];
    return `| ${mode} | ${item.categoryAccuracyPercent.toFixed(1)}% | ${item.priorityAccuracyPercent.toFixed(1)}% | ${item.contractCompliancePercent.toFixed(1)}% | ${item.securityIncidentsCorrectlyIdentified.correct}/${item.securityIncidentsCorrectlyIdentified.total} |`;
  });

  const t = output.metrics.traditional;
  const g = output.metrics.generative;
  const conclusion =
    t.categoryAccuracyPercent === g.categoryAccuracyPercent &&
    t.priorityAccuracyPercent === g.priorityAccuracyPercent &&
    t.contractCompliancePercent === g.contractCompliancePercent
      ? 'En esta muestra, ambos motores obtuvieron los mismos porcentajes de clasificación y cumplimiento del contrato; no hay un ganador cuantitativo. El motor tradicional ofrece resultados deterministas y no depende de un proveedor externo. El generativo puede interpretar mejor lenguaje variado y producir respuestas contextualizadas, pero depende de conectividad, cuota y disponibilidad del modelo. La elección debe considerar precisión observada, latencia, costo y necesidad de revisión humana.'
      : 'Los resultados muestran diferencias entre los motores. La selección debe basarse en los porcentajes de categoría, prioridad y contrato de esta ejecución, además de considerar que el motor tradicional es determinista y local, mientras que el generativo depende de un proveedor externo y puede ofrecer respuestas más contextualizadas. Los incidentes SECURITY deben conservar revisión humana en ambos enfoques.';

  return `# Informe comparativo de AI Support Engine

- **Fecha de ejecución:** ${output.generatedAt}
- **Endpoint:** ${output.endpoint}
- **Casos evaluados:** ${output.cases.length}
- **Casos normales:** ${output.cases.filter((item) => item.type === 'normal').length}
- **Casos ambiguos:** ${output.cases.filter((item) => item.type === 'ambiguous').length}
- **Casos adversariales:** ${output.cases.filter((item) => item.type === 'adversarial').length}

## Resultados por caso

| Caso | Tipo | Categoría esperada | Prioridad esperada | Tradicional: categoría | Tradicional: prioridad | Acierto T | Contrato T | Generativo: categoría | Generativo: prioridad | Acierto G | Contrato G |
|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## Métricas generales

| Motor | Exactitud de categoría | Exactitud de prioridad | Cumplimiento del contrato | Incidentes SECURITY reconocidos |
|---|---:|---:|---:|---:|
${metricRows.join('\n')}

## Conclusión

${conclusion}

> Este informe se genera automáticamente con `npm run evaluate`. Los porcentajes corresponden únicamente a los casos y a la ejecución indicados arriba.
`;
}

async function main(): Promise<void> {
  const results: EvaluationCase[] = [];

  for (const testCase of cases) {
    const traditional = await analyze(testCase, 'traditional');
    const generative = await analyze(testCase, 'generative');
    results.push({
      id: testCase.id,
      type: testCase.type || 'normal',
      expectedCategory: testCase.expectedCategory,
      expectedPriority: testCase.expectedPriority,
      traditional,
      generative,
    });
  }

  const output = {
    status: 'completed',
    generatedAt: new Date().toISOString(),
    endpoint,
    cases: results,
    metrics: {
      traditional: metrics(results, 'traditional'),
      generative: metrics(results, 'generative'),
    },
  };

  writeFileSync(
    resolve(__dirname, 'results.json'),
    `${JSON.stringify(output, null, 2)}\n`,
    'utf8',
  );
  writeFileSync(resolve(__dirname, 'REPORT.md'), buildReport(output), 'utf8');

  console.table(
    results.map((item) => ({
      id: item.id,
      type: item.type,
      expectedCategory: item.expectedCategory,
      traditionalCategory: item.traditional.result?.category ?? item.traditional.error,
      generativeCategory: item.generative.result?.category ?? item.generative.error,
      expectedPriority: item.expectedPriority,
      traditionalPriority: item.traditional.result?.priority ?? item.traditional.error,
      generativePriority: item.generative.result?.priority ?? item.generative.error,
      traditionalCorrect:
        item.traditional.categoryCorrect && item.traditional.priorityCorrect,
      generativeCorrect:
        item.generative.categoryCorrect && item.generative.priorityCorrect,
      traditionalContract: item.traditional.contractValid,
      generativeContract: item.generative.contractValid,
    })),
  );
  console.log('Métricas:', JSON.stringify(output.metrics, null, 2));
  console.log('Informe Markdown generado en evaluation/REPORT.md');

  if (results.some((item) => item.generative.error)) {
    console.error(
      'La evaluación generativa tuvo fallos. Revisa credenciales, cuota, modelo y conexión; no se generaron respuestas simuladas.',
    );
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  console.error(
    `No se pudo completar la evaluación: ${
      error instanceof Error ? error.message : 'error inesperado'
    }`,
  );
  process.exitCode = 1;
});
