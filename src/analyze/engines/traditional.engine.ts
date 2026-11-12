import { Injectable } from '@nestjs/common';
import { AnalyzeResponse, Category, Priority } from '../dto/analyze-response.dto';

@Injectable()
export class TraditionalEngine {
  analyze(message: string): AnalyzeResponse {
    const text = message
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const securityPatterns = [
      /vulnerab/,
      /vulnerability/,
      /brecha/,
      /filtracion/,
      /exposicion de datos/,
      /datos expuestos/,
      /expone credenciales/,
      /acceso no autorizado/,
      /inyeccion sql/,
      /sql injection/,
      /\bxss\b/,
      /cross.?site scripting/,
      /robo de cuenta/,
      /cuenta comprometida/,
      /unauthorized access/,
      /malware/,
      /ransomware/,
      /phishing/,
      /token expuesto/,
      /contrasena expuesta/,
      /credenciales expuestas/,
      /exploit/,
    ];

    const security = securityPatterns.some((pattern) => pattern.test(text));

    let category: Category;
    let priority: Priority;

    if (security) {
      category = 'SECURITY';
      priority = /(explotad|en produccion|datos de clientes|acceso a otras cuentas|cuentas de clientes|datos expuestos|acceso no autorizado a multiples? cuentas)/i.test(text)
        ? 'CRITICAL'
        : 'HIGH';
    } else if (/(iniciar sesion|inicio de sesion|no puedo entrar|no puedo acceder|contrasena|login|autenticacion|cuenta bloqueada|password|sign in|log ?in)/i.test(text)) {
      category = 'ACCESS';
      priority = /(todos los usuarios|todo el equipo|bloqueados|bloqueadas|produccion)/i.test(text)
        ? 'HIGH'
        : 'MEDIUM';
    } else if (/(quiero|necesitamos|solicito|agregar|anadir|implementar|nueva funcion|exportar|modulo|incorporar|would like|please add|request a feature)/i.test(text)) {
      category = 'FEATURE';
      priority = /(urgente|imprescindible|bloquea|fecha limite)/i.test(text)
        ? 'HIGH'
        : 'LOW';
    } else {
      category = 'BUG';
      priority = /(no funciona|error|falla|fallo|se cierra|se congela|no carga|incorrectamente|500|crash|freez|doesn't work|not working)/i.test(text)
        ? 'MEDIUM'
        : 'LOW';
    }

    const responses: Record<Category, string> = {
      ACCESS: 'Lamentamos el inconveniente. Verifique sus credenciales e intente recuperar su contraseña. Si el problema continúa, contacte al equipo de soporte.',
      BUG: 'Gracias por reportar el problema. Registre los pasos para reproducirlo y, si es posible, adjunte el mensaje de error. El equipo técnico revisará el incidente.',
      FEATURE: 'Gracias por su sugerencia. Registraremos la solicitud para evaluar su viabilidad y prioridad dentro de la planificación del producto.',
      SECURITY: 'Hemos identificado un posible incidente de seguridad. Evite compartir más datos sensibles y escale el reporte inmediatamente al equipo responsable para su investigación.',
    };

    return {
      category,
      priority,
      response: responses[category],
      requiresHumanReview: category === 'SECURITY',
      mode: 'traditional',
    };
  }
}
