import { Transform } from 'class-transformer';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class AnalyzeRequestDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(3000)
  message: string;

  @IsString()
  @IsIn(['traditional', 'generative'])
  mode: 'traditional' | 'generative';
}
