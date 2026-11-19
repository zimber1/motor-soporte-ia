import { Injectable } from '@nestjs/common';
import { AnalyzeRequestDto } from './dto/analyze-request.dto';
import { AnalyzeResponse } from './dto/analyze-response.dto';
import { TraditionalEngine } from './engines/traditional.engine';
import { GenerativeEngine } from './engines/generative.engine';
import { MachineLearningEngine } from './engines/machine-learning.engine';

@Injectable()
export class AnalyzeService {
  constructor(
    private readonly traditional: TraditionalEngine,
    private readonly generative: GenerativeEngine,
    private readonly machineLearning: MachineLearningEngine,
  ) {}

  analyze(dto: AnalyzeRequestDto): AnalyzeResponse | Promise<AnalyzeResponse> {
    if (dto.mode === 'traditional') return this.traditional.analyze(dto.message);
    if (dto.mode === 'machine-learning') {
      return this.machineLearning.analyze(dto.message);
    }
    return this.generative.analyze(dto.message);
  }
}
