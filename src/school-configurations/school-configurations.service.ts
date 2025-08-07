import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { schoolConfigurationTable, TSchoolConfigurationSelect, MpesaCredentials, StripeCredentials } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { SchoolService } from '../schools/schools.service';
import { EncryptionService } from '../common/encryption.service';

@Injectable()
export class SchoolConfigurationsService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly schoolService: SchoolService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Updates the configuration for a given school. Encrypts credentials before saving.
   * This is an "upsert" operation.
   */
  async update(schoolId: number, updateDto: UpdateConfigurationDto): Promise<TSchoolConfigurationSelect> {
    await this.schoolService.findOne(schoolId); // Validate school exists

    const dataToUpsert = {
        school_id: schoolId,
        default_payment_gateway: updateDto.default_payment_gateway,
        mpesa_credentials_encrypted: updateDto.mpesa_credentials
            ? this.encryptionService.encrypt(JSON.stringify(updateDto.mpesa_credentials))
            : undefined,
        stripe_credentials_encrypted: updateDto.stripe_credentials
            ? this.encryptionService.encrypt(JSON.stringify(updateDto.stripe_credentials))
            : undefined,
    };
    
    // Use Drizzle's upsert functionality
    const [updatedConfig] = await this.db.insert(schoolConfigurationTable)
        .values(dataToUpsert as typeof schoolConfigurationTable.$inferInsert)
        .onConflictDoUpdate({ 
            target: schoolConfigurationTable.school_id, 
            set: { ...dataToUpsert, updated_at: new Date() } 
        })
        .returning();

    return updatedConfig;
  }

  /**
   * Retrieves the raw configuration for a school (with encrypted credentials).
   * This is useful for settings pages where you don't need to display the secrets.
   */
  async findOne(schoolId: number): Promise<TSchoolConfigurationSelect> {
    const config = await this.db.query.schoolConfigurationTable.findFirst({
        where: eq(schoolConfigurationTable.school_id, schoolId)
    });
    if (!config) {
        throw new NotFoundException(`Configuration for school ID ${schoolId} not found.`);
    }
    return config;
  }

  /**
   * Retrieves the configuration for a school and decrypts the credentials.
   * This is the method our PaymentsService will use.
   * WARNING: Use with care. Do not expose the results of this method directly to the frontend.
   */
  async getDecryptedConfig(schoolId: number): Promise<{
      config_id: number;
      school_id: number;
      default_payment_gateway: string | null;
      mpesa_credentials?: MpesaCredentials;
      stripe_credentials?: StripeCredentials;
  }> {
    const config = await this.findOne(schoolId);

    const decryptedConfig: any = {
      config_id: config.config_id,
      school_id: config.school_id,
      default_payment_gateway: config.default_payment_gateway,
    };
    
    try {
        if (config.mpesa_credentials_encrypted) {
            decryptedConfig.mpesa_credentials = JSON.parse(
                this.encryptionService.decrypt(config.mpesa_credentials_encrypted)
            );
        }
        if (config.stripe_credentials_encrypted) {
            decryptedConfig.stripe_credentials = JSON.parse(
                this.encryptionService.decrypt(config.stripe_credentials_encrypted)
            );
        }
    } catch (error) {
        // This could happen if the ENCRYPTION_SECRET_KEY changes
        throw new Error(`Failed to decrypt credentials for school ID ${schoolId}. Check encryption key.`);
    }

    return decryptedConfig;
  }
}