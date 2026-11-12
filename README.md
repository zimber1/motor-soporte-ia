# AI Support Engine

API REST desarrollada con **NestJS 11** y **TypeScript** para clasificar solicitudes de soporte técnico mediante dos motores: uno tradicional basado en reglas y otro generativo que consulta la API de **Groq**.


Repositorio: https://github.com/zimber1/motor-soporte-ia

## Equipo

| Integrante | Matrícula |
|---|---:|
| Félix | 3523110172 |
| César | 3522110305 |
| Claudia Espíndola López | 3522110551 |

## Objetivo

Clasificar solicitudes de soporte en categorías y prioridades, generar una respuesta inicial y señalar los casos que requieren revisión humana. El proyecto permite contrastar un enfoque basado en reglas con uno generativo conectado a un proveedor externo.

## Arquitectura

El endpoint `POST /api/analyze` valida el DTO de entrada y delega el análisis según el valor de `mode`.

- **`TraditionalEngine`:** aplica reglas y expresiones regulares locales. No utiliza modelos de lenguaje ni necesita conexión a Internet.
- **`GenerativeEngine`:** utiliza el SDK oficial `groq-sdk`, consulta el modelo configurado, valida la respuesta JSON y traduce los errores del proveedor a respuestas controladas.
- **`evaluation/`:** contiene casos de referencia, el comparador HTTP y el archivo donde se guardan los resultados de las ejecuciones.

Ambos motores devuelven `category`, `priority`, `response`, `requiresHumanReview` y `mode`.

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

El motor generativo requiere una API Key de Groq válida, acceso al modelo y cuota disponible. El motor tradicional funciona localmente.

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

Producción:

```bash
npm run start:prod
```

Por defecto, el servidor escucha en `http://localhost:3000`.

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

El campo `mode` acepta `traditional` o `generative`. El mensaje debe tener entre 3 y 3000 caracteres. Las propiedades adicionales se rechazan.

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

## Pruebas y evaluación

Ejecuta las pruebas unitarias:

```bash
npm test
```

Para la evaluación comparativa, inicia primero el servidor:

```bash
npm run start:dev
```

En otra terminal ejecuta:

```bash
npm run evaluate
```

El comparador envía los diez casos de referencia a ambos motores, valida el contrato y compara las categorías y prioridades obtenidas con los valores esperados. Los casos incluyen acceso, errores, funcionalidades, vulnerabilidades, prompt injection y mensajes ambiguos.

Los resultados de cada ejecución se guardan en `evaluation/results.json`. Para cambiar el endpoint se puede definir `API_URL`.

**Estado de la evidencia de evaluación en el repositorio:** el archivo `evaluation/results.json` actualmente contiene una plantilla vacía (`summary` y `results` sin registros). Por ello, los porcentajes de una ejecución anterior no se presentan aquí como resultados verificados por el repositorio. Ejecuta `npm run evaluate` para generar evidencia reproducible y actualizada.

## Evidencias del trabajo del equipo

Esta sección reúne las evidencias técnicas disponibles en el historial del repositorio. Los enlaces permiten consultar los cambios registrados en GitHub.

| Evidencia | Actividad documentada | Enlace |
|---|---|---|
| Inicialización | Configuración inicial del repositorio | [Ver commit](https://github.com/zimber1/motor-soporte-ia/commit/a6829de2b77dcbda41d2b6dafc10749ad824ef34) |
| Configuración del proyecto | `package.json`, TypeScript y Nest CLI | [Ver package.json](https://github.com/zimber1/motor-soporte-ia/commit/07c1917d66e6e3520b0518863703a19d8639c153) |
| Variables de entorno de ejemplo | Incorporación de `.env.example` | [Ver commit](https://github.com/zimber1/motor-soporte-ia/commit/9037d147673d34db16cee7071ce606c495210511) |
| API y DTO | Estructuras de solicitud y respuesta, controlador y servicio | [Ver DTO de solicitud](https://github.com/zimber1/motor-soporte-ia/commit/9987c16099ad1b88726752240f54344e18c9227f) · [Ver controlador](https://github.com/zimber1/motor-soporte-ia/commit/2005f7287724eff0303e47a67fc2f59fc217813f) |
| Motor tradicional | Implementación de clasificación mediante reglas | [Ver commit](https://github.com/zimber1/motor-soporte-ia/commit/721e4b1fb8c50e4717d86df5bf9b3f2d75c6a62b) |
| Motor generativo | Integración con Groq y validación de salida | [Ver commit](https://github.com/zimber1/motor-soporte-ia/commit/161cb9c7834b9e7b96f84bc1705ae5cf91e0418d) |
| Casos de referencia | Registro de diez solicitudes y resultados esperados | [Ver commit](https://github.com/zimber1/motor-soporte-ia/commit/f3a40e9f5272c845475a4551d8f5636dcd0a055b) |
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
- La evaluación depende de los casos de referencia y de la configuración utilizada.
- Los incidentes de seguridad requieren revisión humana; el sistema no debe tomar decisiones críticas de seguridad de forma autónoma.

## Conclusión

AI Support Engine integra clasificación tradicional basada en reglas y clasificación generativa mediante Groq. El proyecto incluye validación de solicitudes, manejo controlado de errores, reglas de revisión humana, pruebas unitarias y un mecanismo para comparar ambos motores mediante casos de referencia.