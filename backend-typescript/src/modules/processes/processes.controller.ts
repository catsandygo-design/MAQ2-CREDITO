import { Controller, Get } from '@nestjs/common';

import { ProcessResponseDto } from './dto/process-response.dto';
import { ProcessesService } from './processes.service';

@Controller('processes')
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Get('example')
  example(): ProcessResponseDto {
    return this.processesService.findExampleProcess();
  }
}
