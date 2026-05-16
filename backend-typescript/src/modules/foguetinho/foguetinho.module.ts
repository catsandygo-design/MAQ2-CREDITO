import { Module } from '@nestjs/common';

import { FoguetinhoController } from './foguetinho.controller';
import { FoguetinhoService } from './foguetinho.service';

@Module({
  controllers: [FoguetinhoController],
  providers: [FoguetinhoService],
  exports: [FoguetinhoService],
})
export class FoguetinhoModule {}
