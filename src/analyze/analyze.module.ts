import { Module } from '@nestjs/common';
import { AnalyzeController } from './analyze.controller';
import { AnalyzeService } from './analyze.service';
import { TraditionalEngine } from './engines/traditional.engine';
import { GenerativeEngine } from './engines/generative.engine';
import { MachineLearningEngine } from './engines/machine-learning.engine';

@Module({
  controllers: [AnalyzeController],
  providers: [
    AnalyzeService,
    TraditionalEngine,
    GenerativeEngine,
    MachineLearningEngine,
  ],
})
export class AnalyzeModule {}
