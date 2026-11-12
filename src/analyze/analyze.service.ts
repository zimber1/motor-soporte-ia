import { Injectable } from '@nestjs/common';
import { AnalyzeRequestDto } from './dto/analyze-request.dto';
import { AnalyzeResponse } from './dto/analyze-response.dto';
import { TraditionalEngine } from './engines/traditional.engine';
import { GenerativeEngine } from './engines/generative.engine';

@Injectable()
export class AnalyzeService {
  constructor(
    private readonly traditional: TraditionalEngine,
    private readonly generative: GenerativeEngine,
  ) {}

  analyze(dto: AnalyzeRequestDto): AnalyzeResponse | Promise<AnalyzeResponse> {
    if (dto.mode === 'traditional') return this.traditional.analyze(dto.message);
    return this.generative.analyze(dto.message);
  }
}
