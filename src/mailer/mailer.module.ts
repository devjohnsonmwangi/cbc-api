import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mailer.service';

@Global() // Makes the module's exports available application-wide
@Module({
  imports: [ConfigModule], // Import ConfigModule because MailService needs ConfigService
  providers: [MailService],
  exports: [MailService], // Export MailService so other modules can use it
})
export class MailModule {}