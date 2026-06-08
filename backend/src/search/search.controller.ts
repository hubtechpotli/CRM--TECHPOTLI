import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SearchService } from './search.service';
import { CurrentUser, JwtPayload } from '../common/decorators/user.decorator';

@Controller('search')
@UseGuards(AuthGuard('jwt'))
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  query(@Query('q') q: string, @CurrentUser() user: JwtPayload) {
    return this.searchService.search(q || '', user.role, user.sub);
  }
}
