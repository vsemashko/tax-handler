import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class NipValidatorService {
  /**
   * Validate Polish NIP (Tax Identification Number)
   * NIP format: 10 digits with checksum validation
   */
  validate(nip: string): boolean {
    if (!nip) {
      return false;
    }

    // Remove any non-digit characters
    const cleanNip = nip.replace(/[^0-9]/g, '');

    // NIP must be exactly 10 digits
    if (cleanNip.length !== 10) {
      return false;
    }

    // Calculate checksum
    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    let sum = 0;

    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanNip[i]) * weights[i];
    }

    const checksum = sum % 11;
    const lastDigit = parseInt(cleanNip[9]);

    // Checksum must match the last digit
    if (checksum === 10) {
      // Invalid NIP if checksum is 10
      return false;
    }

    return checksum === lastDigit;
  }

  /**
   * Format NIP with dashes (XXX-XXX-XX-XX or XXX-XX-XX-XXX)
   */
  format(nip: string, formatType: 'standard' | 'alternative' = 'standard'): string {
    const cleanNip = nip.replace(/[^0-9]/g, '');

    if (cleanNip.length !== 10) {
      throw new BadRequestException('Invalid NIP length');
    }

    if (formatType === 'alternative') {
      // Format: XXX-XX-XX-XXX
      return `${cleanNip.slice(0, 3)}-${cleanNip.slice(3, 5)}-${cleanNip.slice(5, 7)}-${cleanNip.slice(7)}`;
    }

    // Standard format: XXX-XXX-XX-XX
    return `${cleanNip.slice(0, 3)}-${cleanNip.slice(3, 6)}-${cleanNip.slice(6, 8)}-${cleanNip.slice(8)}`;
  }

  /**
   * Clean NIP (remove all non-digit characters)
   */
  clean(nip: string): string {
    return nip.replace(/[^0-9]/g, '');
  }

  /**
   * Validate and throw exception if invalid
   */
  validateOrThrow(nip: string): void {
    if (!this.validate(nip)) {
      throw new BadRequestException(`Invalid NIP: ${nip}`);
    }
  }
}
