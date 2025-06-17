import { Module } from '@nestjs/common';
import { GovernanceController } from './governance.controller';
import { GovernanceService } from './governance.service';

@Module({
  controllers: [GovernanceController],
  providers: [GovernanceService]
})
export class GovernanceModule {}
