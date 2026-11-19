import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AnalyzeResponse,
  Category,
  Priority,
} from '../dto/analyze-response.dto';

const categoryDetails: Record<
  Category,
  { priority: Priority; response: string; requiresHumanReview: boolean }
> = {
  ACCESS: {
    priority: 'MEDIUM',
    response: 'La solicitud se clasificó como un problema de acceso. El equipo de soporte revisará el caso.',
    requiresHumanReview: false,
  },
  BUG: {
    priority: 'LOW',
    response: 'La solicitud se clasificó como un problema técnico. El equipo revisará los detalles reportados.',
    requiresHumanReview: false,
  },
  FEATURE: {
    priority: 'LOW',
    response: 'La solicitud se clasificó como una propuesta de mejora para su evaluación.',
    requiresHumanReview: false,
  },
  SECURITY: {
    priority: 'HIGH',
    response: 'La solicitud se clasificó como un posible problema de seguridad y requiere revisión del equipo responsable.',
    requiresHumanReview: true,
  },
};

function isCategory(value: unknown): value is Category {
  return (
    value === 'ACCESS' ||
    value === 'BUG' ||
    value === 'FEATURE' ||
    value === 'SECURITY'
  );
}

@Injectable()
export class MachineLearningEngine {
  private readonly endpoint =
    process.env.ML_SERVICE_URL ?? 'http://127.0.0.1:8000/predict';

  async analyze(message: string): Promise<AnalyzeResponse> {
    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        'El servicio de clasificación ML no está disponible.',
        { cause: error },
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `El servicio de clasificación ML respondió con HTTP ${response.status}.`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new BadGatewayException(
        'El servicio de clasificación ML devolvió una respuesta inválida.',
        { cause: error },
      );
    }

    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('category' in payload) ||
      !isCategory(payload.category)
    ) {
      throw new BadGatewayException(
        'El servicio de clasificación ML devolvió una categoría desconocida.',
      );
    }

    return {
      category: payload.category,
      ...categoryDetails[payload.category],
      mode: 'machine-learning',
    };
  }
}
