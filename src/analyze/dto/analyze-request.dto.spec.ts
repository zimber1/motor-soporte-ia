import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { AnalyzeRequestDto } from './analyze-request.dto';

describe('AnalyzeRequestDto validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: () => new BadRequestException('Solicitud inválida.'),
  });
  const metadata = { type: 'body' as const, metatype: AnalyzeRequestDto };

  it('accepts a trimmed message and a supported mode', async () => {
    const result = await pipe.transform(
      { message: '  No puedo entrar  ', mode: 'traditional' },
      metadata,
    );

    expect(result.message).toBe('No puedo entrar');
  });

  it.each([
    { message: '  ', mode: 'traditional' },
    { message: 'mensaje válido', mode: 'other' },
    { message: 'x'.repeat(3001), mode: 'generative' },
    { message: 'mensaje válido', mode: 'traditional', extra: true },
  ])('rejects invalid input %#', async (body) => {
    await expect(pipe.transform(body, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
