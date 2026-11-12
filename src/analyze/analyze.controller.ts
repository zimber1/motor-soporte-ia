import { Body, Controller, Post } from '@nestjs/common';
import { AnalyzeRequestDto } from './dto/analyze-request.dto';
import { AnalyzeService } from './analyze.service';

@Controller('analyze')
export class AnalyzeController {
  constructor(private readonly analyzeService: AnalyzeService) {}

  @Post()
  analyze(@Body() dto: AnalyzeRequestDto) {
    return this.analyzeService.analyze(dto);
  }
}
