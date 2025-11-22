import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhiteListService } from './services/white-list.service';
import { WhiteListCheck } from './entities/white-list-check.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WhiteListCheck])],
  providers: [WhiteListService],
  exports: [WhiteListService],
})
export class WhiteListModule {}
