# AI Support Engine

API REST desarrollada con **NestJS 11** y **TypeScript** para clasificar solicitudes de soporte técnico mediante tres motores: uno tradicional basado en reglas, uno generativo conectado a **Groq** y uno de Machine Learning con **scikit-learn** servido por **FastAPI**.

Repositorio: https://github.com/zimber1/motor-soporte-ia

## Equipo

| Integrante | Matrícula |
|---|---:|
| Félix | 3523110172 |
| César | 3522110305 |
| Claudia Espíndola López | 3522110551 |

## Objetivo

Clasificar solicitudes de soporte en categorías y prioridades, generar una respuesta inicial y señalar los casos que requieren revisión humana. El proyecto permite comparar reglas deterministas, generación de texto con un proveedor externo e inferencia local de un clasificador TF-IDF.

## Arquitectura

El endpoint `POST /api/analyze` valida el DTO de entrada y delega el análisis según el valor de `mode`.

- **`TraditionalEngine`:** aplica reglas y expresiones regulares locales. No utiliza modelos de lenguaje ni necesita conexión a Internet.
- **`GenerativeEngine`:** utiliza el SDK oficial `groq-sdk`, consulta el modelo configurado, valida la respuesta JSON y traduce los errores del proveedor a respuestas controladas.
- **`MachineLearningEngine`:** envía el mensaje al servicio FastAPI local, valida la categoría recibida y la adapta al contrato común de NestJS.
- **Servicio Python:** `ml-service/main.py` expone `POST /predict`; carga `ml-service/model.joblib` y predice una categoría.
- **`evaluation/`:** contiene once casos de referencia y el comparador HTTP para los motores Traditional y Generative. El comparador actual no incluye el motor Machine Learning.

Los tres motores devuelven `category`, `priority`, `response`, `requiresHumanReview` y `mode`.

### Funcionamiento de Machine Learning

`ml-service/train.py` valida `ml-service/data/tickets.csv` antes de entrenar. Conserva el flujo supervisado solicitado: `train_test_split(test_size=0.2, stratify=..., random_state=42)`, un `Pipeline` con `TfidfVectorizer(ngram_range=(1, 2))` y `LogisticRegression(max_iter=1000)`. Evalúa únicamente el conjunto TEST con Accuracy, Precision, Recall, F1-score, `classification_report` y matriz de confusión. Guarda y vuelve a cargar el pipeline comprimido en `ml-service/model.joblib` para verificar la persistencia.

El dataset contiene **200 registros sintéticos equilibrados**: 50 por categoría (ACCESS, BUG, FEATURE y SECURITY). Todos los mensajes son distintos y la columna `source` tiene el valor `synthetic`. El entrenamiento utiliza `message` como entrada y `category` como etiqueta; `source` se usa para validar el origen de los ejemplos. Los once casos de `evaluation/test-cases.json` no se incorporan al entrenamiento.

FastAPI carga el modelo al recibir la primera predicción y lo conserva en memoria. Si el archivo no existe, `POST /predict` responde con HTTP 503. El servicio Python devuelve únicamente `category`; NestJS completa el contrato. Las prioridades del motor ML son deterministas, no predicciones del clasificador: ACCESS → MEDIUM, BUG → LOW, FEATURE → LOW y SECURITY → HIGH. Los casos SECURITY requieren revisión humana.

### Categorías

- `ACCESS`: problemas de acceso y autenticación.
- `BUG`: errores o comportamientos inesperados.
- `FEATURE`: solicitudes de nuevas funcionalidades.
- `SECURITY`: vulnerabilidades o incidentes de seguridad.

### Prioridades

`LOW`, `MEDIUM`, `HIGH` y `CRITICAL`.

Toda clasificación `SECURITY` requiere revisión humana y no puede quedar en prioridad `LOW`.

## Tecnologías y requisitos

- Node.js 20 o superior y npm.
- NestJS 11 y TypeScript.
- `class-validator` y `class-transformer`.
- SDK oficial `groq-sdk`.
- Jest para pruebas automatizadas.
- Python, pandas, scikit-learn, joblib, FastAPI y Uvicorn para el servicio ML.

El motor generativo requiere una API Key de Groq válida, acceso al modelo y cuota disponible. El motor tradicional funciona localmente. El motor ML requiere el servicio FastAPI y el modelo local generado.

## Estructura del repositorio

```text
.
├── evaluation/
│   ├── compare.ts
│   ├── test-cases.json
│   ├── results.json
│   └── REPORT.md
├── ml-service/
│   ├── data/
│   │   └── tickets.csv
│   ├── main.py
│   ├── requirements.txt
│   └── train.py
├── src/
│   ├── analyze/
│   │   ├── dto/
│   │   └── engines/
│   ├── app.module.ts
│   └── main.ts
├── .env.example
├── package.json
└── README.md
```

`ml-service/.venv/` es un entorno local ignorado por Git. `ml-service/model.joblib` se genera localmente al entrenar; no debe añadirse a commits. `node_modules/` y `dist/` son directorios locales/de compilación.

## Instalación

```bash
git clone https://github.com/zimber1/motor-soporte-ia.git
cd motor-soporte-ia
npm install
```

Crea el archivo local de variables de entorno:

```powershell
Copy-Item .env.example .env
```

Configura `.env`:

```env
GROQ_API_KEY=tu_clave_de_groq
GROQ_MODEL=openai/gpt-oss-20b
PORT=3000
```

Obtén una clave desde [Groq Console](https://console.groq.com/keys).

### Servicio Python

Para instalar las bibliotecas requeridas por el entrenamiento (como en las diapositivas):

```powershell
python -m pip install pandas scikit-learn
```

Para instalar también las dependencias del servicio FastAPI:

```powershell
python -m pip install -r .\ml-service\requirements.txt
```

Ejecuta los comandos en el entorno de Python que ya utilizas. No es necesario instalar Anaconda, Docker ni crear otro entorno virtual si ya tienes Python configurado.

`requirements.txt` declara pandas, scikit-learn, joblib, FastAPI y Uvicorn sin extras opcionales para reducir el espacio utilizado. No se fijan versiones.

**Seguridad:** `.env` está excluido mediante `.gitignore`. No publiques la API Key, no la incluyas en el código fuente y no compartas el contenido de ese archivo.

El modelo predeterminado configurado es `openai/gpt-oss-20b`. Su disponibilidad, permisos y cuota dependen de Groq y pueden cambiar. Si deja de estar disponible, el servicio informa el error; no cambia silenciosamente a otro modelo.

## Ejecución

Desarrollo:

```bash
npm run start:dev
```

Compilación:

```bash
npm run build
```

Pruebas automatizadas:

```bash
npm test
```

Producción:

```bash
npm run start:prod
```

Por defecto, el servidor escucha en `http://localhost:3000`.

### Entrenamiento y servicio Python

El entrenamiento requiere `ml-service/data/tickets.csv` y guarda el modelo en `ml-service/model.joblib`:

```powershell
.\ml-service\.venv\Scripts\python.exe .\ml-service\train.py
```

Para atender predicciones, inicia Uvicorn desde la raíz del repositorio:

```powershell
.\ml-service\.venv\Scripts\python.exe -m uvicorn main:app --app-dir ml-service --host 127.0.0.1 --port 8000
```

El proceso NestJS usa por defecto `http://127.0.0.1:8000/predict` para el modo `machine-learning`. Se puede cambiar la URL mediante `ML_SERVICE_URL`. Mantén Uvicorn y NestJS ejecutándose en terminales separadas.

## API

**Método:** `POST`

**Endpoint:** `http://localhost:3000/api/analyze`

**Content-Type:** `application/json`

Ejemplo de solicitud:

```json
{
  "message": "No puedo iniciar sesión",
  "mode": "generative"
}
```

El campo `mode` acepta `traditional`, `generative` o `machine-learning`. El mensaje debe tener entre 3 y 3000 caracteres. Las propiedades adicionales se rechazan.

Ejemplo de respuesta:

```json
{
  "category": "ACCESS",
  "priority": "MEDIUM",
  "response": "Verifique sus credenciales e intente recuperar su contraseña. Si el problema continúa, contacte al equipo de soporte.",
  "requiresHumanReview": false,
  "mode": "traditional"
}
```

### Predicción Python

**Método:** `POST`

**Endpoint:** `http://127.0.0.1:8000/predict`

**Content-Type:** `application/json`

Solicitud:

```json
{
  "text": "No puedo acceder a mi cuenta con mi clave"
}
```

Respuesta:

```json
{
  "category": "ACCESS"
}
```

Este endpoint solo devuelve la categoría. La llamada de NestJS (`mode: "machine-learning"`) la adapta al contrato común de `/api/analyze`.

Prueba desde PowerShell:

```powershell
$body = @{
    message = "Encontré una vulnerabilidad SQL Injection"
    mode = "traditional"
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://localhost:3000/api/analyze" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

## Validación y seguridad

- Valida los datos de entrada mediante DTO.
- Rechaza propiedades que no estén declaradas.
- Valida la estructura y los valores de la respuesta generativa.
- Fuerza `requiresHumanReview=true` para la categoría `SECURITY`.
- Trata el contenido de los tickets como datos no confiables; no obedece instrucciones incluidas en el mensaje.
- No expone credenciales ni detalles internos del proveedor en la respuesta HTTP.

**Pendiente de endurecimiento antes de producción:** actualmente CORS está habilitado sin una lista de orígenes permitidos. Debe configurarse una allowlist según los dominios del cliente. También conviene incorporar autenticación y limitación de solicitudes (rate limiting) si la API se publica fuera de un entorno académico o controlado.

## Evaluación comparativa

La batería comparativa de `evaluation/test-cases.json` contiene **11 casos**:

- 8 casos normales de acceso, errores, funcionalidades e incidentes de seguridad.
- 2 casos adversariales que intentan manipular la categoría o la prioridad mediante instrucciones incluidas en el ticket.
- 1 caso ambiguo de descripción insuficiente.

> La distribución exacta por tipo se incluye en `evaluation/test-cases.json`; cada registro identifica su tipo como `normal`, `ambiguous` o `adversarial`.

Inicia el servidor en una terminal:

```bash
npm run start:dev
```

En otra terminal ejecuta:

```bash
npm run evaluate
```

El comparador actual consulta únicamente Traditional y Generative para cada caso, valida el contrato de respuesta y calcula exactitud de categoría, exactitud de prioridad, cumplimiento del contrato y reconocimiento de incidentes SECURITY. No evalúa Machine Learning. Los resultados se guardan en:

- `evaluation/results.json`: resultados estructurados para análisis posterior.
- `evaluation/REPORT.md`: tabla comparativa por caso, porcentajes y conclusión técnica en Markdown.

Para cambiar el endpoint, configura `EVALUATION_API_URL` (no `API_URL`):

```powershell
$env:EVALUATION_API_URL = "http://127.0.0.1:3000/api/analyze"
npm run evaluate
```

**Evaluación comparativa histórica:** `evaluation/results.json` y `evaluation/REPORT.md` registran la ejecución del **18 de noviembre de 2026** contra `http://127.0.0.1:3000/api/analyze`, con los once casos de referencia. En esa ejecución, Traditional y Generative obtuvieron 100 % de exactitud de categoría, 100 % de exactitud de prioridad y 100 % de cumplimiento del contrato; ambos reconocieron los cuatro incidentes SECURITY. Esos resultados son históricos, solo cubren esos dos motores y no describen el rendimiento de Machine Learning.

### Evaluación del clasificador ML

La partición estratificada reserva 160 registros para TRAIN y 40 para TEST (10 por categoría). El entrenamiento imprime Accuracy, Precision, Recall y F1-score macro, además del reporte de clasificación y la matriz de confusión.

En una ejecución de comprobación con el dataset sintético incluido, el pipeline obtuvo 100 % en estas métricas y clasificó correctamente los 40 ejemplos de TEST. **Este resultado no debe interpretarse como rendimiento esperado en producción:** los mensajes fueron generados mediante plantillas sintéticas y TRAIN/TEST comparten estructuras lingüísticas. Para medir generalización real se necesita un conjunto independiente de tickets representativos, revisados y etiquetados por personas.

## Evidencias de ejecución para la entrega

### Verificaciones de la implementación actual

| Verificación | Resultado |
|---|---:|
| Compilación `npm run build` | Correcta |
| Pruebas Analyze/Traditional | 16 aprobadas |
| Prueba de integración Generative | Omitida para evitar una llamada externa a Groq |
| FastAPI con Uvicorn y `POST /predict` | HTTP 200; devolvió `ACCESS` |
| Carga e inferencia de `model.joblib` mediante FastAPI | Correcta |
| Dataset ML | 20 registros sintéticos equilibrados |
| Accuracy / F1 macro del conjunto de prueba ML | 25 % / 0.10 |

La ejecución comparativa de once casos descrita arriba es histórica y solo cubre Traditional y Generative. La prueba Generative omitida no confirma el estado actual de conectividad o cuota de Groq.

## Evidencias del trabajo del equipo

Esta sección reúne las evidencias técnicas disponibles en el historial del repositorio. Los enlaces permiten consultar los cambios registrados en GitHub.

| Evidencia | Actividad documentada | Enlace |
|---|---|---|
| Inicialización | Configuración inicial del repositorio | [Ver commit](https://github.com/zimber1/motor-soporte-ia/commit/a6829de2b77dcbda41d2b6dafc10749ad824ef34) |
| Configuración del proyecto | `package.json`, TypeScript y Nest CLI | [Ver commit](https://github.com/zimber1/motor-soporte-ia/commit/07c1917d66e6e3520b0518863703a19d8639c153) |
| Variables de entorno de ejemplo | Incorporación de `.env.example` | [Ver commit](https://github.com/zimber1/motor-soporte-ia/commit/9037d147673d34db16cee7071ce606c495210511) |
| API y DTO | Estructuras de solicitud y respuesta, controlador y servicio | [Ver DTO de solicitud](https://github.com/zimber1/motor-soporte-ia/commit/9987c16099ad1b88726752240f54344e18c9227f) · [Ver controlador](https://github.com/zimber1/motor-soporte-ia/commit/2005f7287724eff0303e47a67fc2f59fc217813f) |
| Motor tradicional | Implementación de clasificación mediante reglas | [Ver commit](https://github.com/zimber1/motor-soporte-ia/commit/721e4b1fb8c50e4717d86df5bf9b3f2d75c6a62b) |
| Motor generativo | Integración con Groq y validación de salida | [Ver commit](https://github.com/zimber1/motor-soporte-ia/commit/161cb9c7834b9e7b96f84bc1705ae5cf91e0418d) |
| Casos de referencia | Registro de solicitudes y resultados esperados | [Ver commit](https://github.com/zimber1/motor-soporte-ia/commit/f3a40e9f5272c845475a4551d8f5636dcd0a055b) |
| Evaluación comparativa | Ejecutor HTTP para comparar ambos motores | [Ver commit](https://github.com/zimber1/motor-soporte-ia/commit/7f58195164e964cdc18d36ea5e3618d1e229475e) |
| Pruebas unitarias | Pruebas del motor tradicional para acceso, errores, funcionalidades y seguridad | [Ver commit](https://github.com/zimber1/motor-soporte-ia/commit/beadf3b48d136552a81580030f5fa9660fea1f81) |
| Documentación | Instrucciones de instalación, API, pruebas y evaluación | [Ver documentación](https://github.com/zimber1/motor-soporte-ia/commit/841006a0b3b557fbc4f43553df65dfed2b94ea83) |

### Evidencia individual y trazabilidad

Los integrantes registrados para el proyecto son Félix, César y Claudia Espíndola López. El historial consultado muestra los commits anteriores registrados bajo la cuenta de GitHub `zimber1`; no presenta una separación verificable de esos cambios por integrante.

Por esa razón, las evidencias de esta sección se presentan como **evidencia técnica compartida del proyecto** y no se asignan individualmente a una persona sin respaldo en los metadatos de GitHub. Las matrículas identifican a los integrantes, pero no demuestran por sí solas la autoría de un commit.

## Limitaciones

- El motor tradicional depende de las reglas implementadas y puede no reconocer mensajes fuera de los patrones previstos.
- El motor generativo depende de la conectividad, disponibilidad, permisos y cuota de Groq.
- Las clasificaciones generativas pueden contener errores y deben tratarse como apoyo al equipo de soporte.
- La evaluación depende de los casos de referencia y de la configuración utilizada; once casos no representan todos los escenarios posibles.
- El clasificador ML utiliza 200 registros sintéticos y una partición TEST de 40 ejemplos. Las métricas sobre textos sintéticos no demuestran rendimiento en producción; se requiere validación posterior con tickets reales, representativos y etiquetados.
- El motor ML predice categoría, no prioridad ni confianza. NestJS asigna prioridades fijas por categoría; el resultado sigue requiriendo evaluación antes de uso operativo.
- NestJS necesita que FastAPI esté disponible en `ML_SERVICE_URL` (por defecto `http://127.0.0.1:8000/predict`) para el modo Machine Learning.
- La protección contra instrucciones maliciosas en el texto es una mitigación basada en prompt y no una garantía absoluta.
- Los incidentes de seguridad requieren revisión humana; el sistema no debe tomar decisiones críticas de seguridad de forma autónoma.

## Conclusión

Traditional ofrece clasificación determinista y local; Generative puede interpretar mensajes variados, pero depende de Groq; Machine Learning realiza inferencia local mediante el servicio Python, aunque su rendimiento actual es bajo y se basa en datos sintéticos. La evaluación comparativa de once casos solo cubre los dos primeros motores. Ningún resultado sustituye la revisión humana de incidentes SECURITY.
