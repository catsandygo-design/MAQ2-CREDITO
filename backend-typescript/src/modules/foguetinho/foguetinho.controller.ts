import { Body, Controller, Post } from '@nestjs/common';

import type { FoguetinhoContext } from './domain/foguetinho-context';
import { FoguetinhoEvaluation, FoguetinhoService } from './foguetinho.service';

@Controller('foguetinho')
export class FoguetinhoController {
  constructor(private readonly foguetinhoService: FoguetinhoService) {}

  @Post('evaluate')
  evaluate(@Body() context: FoguetinhoContext): FoguetinhoEvaluation {
    return this.foguetinhoService.evaluate(context);
  }
}
