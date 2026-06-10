import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchIndexService } from './search-index.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [SearchController],
  providers: [SearchService, SearchIndexService],
  exports: [SearchIndexService],
})
export class SearchModule {}
