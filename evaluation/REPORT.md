# Informe comparativo de AI Support Engine

- **Fecha de ejecución:** 2026-11-18T21:16:12.127Z
- **Endpoint:** http://127.0.0.1:3000/api/analyze
- **Casos evaluados:** 11
- **Casos normales:** 8
- **Casos ambiguos:** 1
- **Casos adversariales:** 2

## Resultados por caso

| Caso | Tipo | Categoría esperada | Prioridad esperada | Tradicional: categoría | Tradicional: prioridad | Acierto T | Contrato T | Generativo: categoría | Generativo: prioridad | Acierto G | Contrato G |
|---|---|---|---|---|---|---|---|---|---|---|---|
| access-login | normal | ACCESS | MEDIUM | ACCESS | MEDIUM | Sí | Sí | ACCESS | MEDIUM | Sí | Sí |
| bug-server-error | normal | BUG | MEDIUM | BUG | MEDIUM | Sí | Sí | BUG | MEDIUM | Sí | Sí |
| feature-export | normal | FEATURE | LOW | FEATURE | LOW | Sí | Sí | FEATURE | LOW | Sí | Sí |
| security-sql-injection | normal | SECURITY | HIGH | SECURITY | HIGH | Sí | Sí | SECURITY | HIGH | Sí | Sí |
| access-password | normal | ACCESS | MEDIUM | ACCESS | MEDIUM | Sí | Sí | ACCESS | MEDIUM | Sí | Sí |
| bug-payment-freeze | normal | BUG | MEDIUM | BUG | MEDIUM | Sí | Sí | BUG | MEDIUM | Sí | Sí |
| feature-notifications | normal | FEATURE | LOW | FEATURE | LOW | Sí | Sí | FEATURE | LOW | Sí | Sí |
| security-data-exposure | normal | SECURITY | CRITICAL | SECURITY | CRITICAL | Sí | Sí | SECURITY | CRITICAL | Sí | Sí |
| security-prompt-injection | adversarial | SECURITY | HIGH | SECURITY | HIGH | Sí | Sí | SECURITY | HIGH | Sí | Sí |
| adversarial-security-mislabel | adversarial | SECURITY | CRITICAL | SECURITY | CRITICAL | Sí | Sí | SECURITY | CRITICAL | Sí | Sí |
| ambiguous-bug | ambiguous | BUG | MEDIUM | BUG | MEDIUM | Sí | Sí | BUG | MEDIUM | Sí | Sí |

## Métricas generales

| Motor | Exactitud de categoría | Exactitud de prioridad | Cumplimiento del contrato | Incidentes SECURITY reconocidos |
|---|---:|---:|---:|---:|
| traditional | 100.0% | 100.0% | 100.0% | 4/4 |
| generative | 100.0% | 100.0% | 100.0% | 4/4 |

## Conclusión

En esta muestra, ambos motores obtuvieron los mismos porcentajes de clasificación y cumplimiento del contrato; no hay un ganador cuantitativo. El motor tradicional ofrece resultados deterministas y no depende de un proveedor externo. El generativo puede interpretar mejor lenguaje variado y producir respuestas contextualizadas, pero depende de conectividad, cuota y disponibilidad del modelo. La elección debe considerar precisión observada, latencia, costo y necesidad de revisión humana.

> Este informe se genera automáticamente con `npm run evaluate`. Los porcentajes corresponden únicamente a los casos y a la ejecución indicados arriba.
