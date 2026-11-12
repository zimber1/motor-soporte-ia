import { existsSync, readFileSync } from 'node:fs';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { GenerativeEngine } from './generative.engine';

function hasConfiguredApiKey(): boolean {
  if (process.env.GROQ_API_KEY?.trim()) return true;
  if (!existsSync('.env')) return false;

  return readFileSync('.env', 'utf8').split(/\r?\n/).some((line) => {
    const match = line.match(/^\s*GROQ_API_KEY\s*=\s*(.*?)\s*$/);
    return Boolean(match?.[1] && match[1] !== '""' && match[1] !== "''");
  });
}

const groqTest = hasConfiguredApiKey() ? it : it.skip;

describe('GenerativeEngine (Groq integration)', () => {
  groqTest(
    'calls Groq and returns a valid response contract',
    async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' })],
        providers: [GenerativeEngine],
      }).compile();

      try {
        const engine = new GenerativeEngine(moduleRef.get(ConfigService));
        const result = await engine.analyze('No puedo iniciar sesión en mi cuenta');

        expect(['ACCESS', 'BUG', 'FEATURE', 'SECURITY']).toContain(result.category);
        expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(result.priority);
        expect(result.response.trim().length).toBeGreaterThan(0);
        expect(typeof result.requiresHumanReview).toBe('boolean');
        expect(result.mode).toBe('generative');
        if (result.category === 'SECURITY') {
          expect(result.requiresHumanReview).toBe(true);
          expect(result.priority).not.toBe('LOW');
        }
      } finally {
        await moduleRef.close();
      }
    },
    180_000,
  );
});
