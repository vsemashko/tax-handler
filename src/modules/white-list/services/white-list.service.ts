import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhiteListCheck } from '../entities/white-list-check.entity';
import axios, { AxiosInstance } from 'axios';

export interface WhiteListVerificationResult {
  nip: string;
  bankAccount: string;
  isVerified: boolean;
  verificationDate: Date;
  status: 'verified' | 'not_found' | 'error';
  details?: any;
}

@Injectable()
export class WhiteListService {
  private readonly logger = new Logger(WhiteListService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly apiUrl = 'https://wl-api.mf.gov.pl'; // Polish Ministry of Finance White List API

  constructor(
    @InjectRepository(WhiteListCheck)
    private readonly whiteListCheckRepository: Repository<WhiteListCheck>,
  ) {
    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      timeout: 10000,
      headers: {
        Accept: 'application/json',
      },
    });
  }

  /**
   * Verify if bank account is on the white list
   * Note: This is a stub implementation as the actual API requires authentication
   */
  async verifyBankAccount(
    nip: string,
    bankAccount: string,
    transactionId?: string,
  ): Promise<WhiteListVerificationResult> {
    this.logger.log(`Verifying bank account for NIP: ${nip}`);

    const cleanNip = nip.replace(/[^0-9]/g, '');
    const cleanAccount = bankAccount.replace(/[^0-9]/g, '');

    // Check if we have a recent verification in the database
    const recentCheck = await this.whiteListCheckRepository.findOne({
      where: {
        nip: cleanNip,
        bankAccount: cleanAccount,
      },
      order: {
        checkDate: 'DESC',
      },
    });

    // If we have a check from today, return cached result
    if (recentCheck && this.isToday(recentCheck.checkDate)) {
      this.logger.log('Returning cached white list check result');
      return {
        nip: cleanNip,
        bankAccount: cleanAccount,
        isVerified: recentCheck.isVerified,
        verificationDate: recentCheck.checkDate,
        status: recentCheck.verificationStatus as any,
        details: recentCheck.apiResponse,
      };
    }

    // Perform actual verification
    let verificationResult: WhiteListVerificationResult;

    try {
      // Note: This is a stub. Real implementation would call the actual API
      // const response = await this.axiosInstance.get(`/api/check/nip/${cleanNip}/bank-account/${cleanAccount}`);

      // For development, we'll simulate a response
      verificationResult = {
        nip: cleanNip,
        bankAccount: cleanAccount,
        isVerified: true, // In production, this would come from the API
        verificationDate: new Date(),
        status: 'verified',
        details: {
          message: 'Bank account verified (simulated)',
          timestamp: new Date().toISOString(),
        },
      };

      this.logger.log(`Verification result: ${verificationResult.status}`);
    } catch (error) {
      this.logger.error(`White list verification failed: ${error.message}`);

      verificationResult = {
        nip: cleanNip,
        bankAccount: cleanAccount,
        isVerified: false,
        verificationDate: new Date(),
        status: 'error',
        details: {
          error: error.message,
        },
      };
    }

    // Store verification result
    await this.storeVerificationResult(verificationResult, transactionId);

    return verificationResult;
  }

  /**
   * Store verification result in database
   */
  private async storeVerificationResult(
    result: WhiteListVerificationResult,
    transactionId?: string,
  ): Promise<WhiteListCheck> {
    const check = this.whiteListCheckRepository.create({
      nip: result.nip,
      bankAccount: result.bankAccount,
      checkDate: result.verificationDate,
      isVerified: result.isVerified,
      verificationStatus: result.status,
      apiResponse: result.details,
      checkedForTransactionId: transactionId || null,
    });

    return this.whiteListCheckRepository.save(check);
  }

  /**
   * Get verification history for NIP and account
   */
  async getVerificationHistory(nip: string, bankAccount: string): Promise<WhiteListCheck[]> {
    const cleanNip = nip.replace(/[^0-9]/g, '');
    const cleanAccount = bankAccount.replace(/[^0-9]/g, '');

    return this.whiteListCheckRepository.find({
      where: {
        nip: cleanNip,
        bankAccount: cleanAccount,
      },
      order: {
        checkDate: 'DESC',
      },
      take: 10,
    });
  }

  /**
   * Check if account should be verified (based on transaction amount)
   */
  shouldVerifyAccount(transactionAmountPln: number): boolean {
    // Per Polish regulations: verify for transactions > 15,000 PLN
    const threshold = 15000;
    return transactionAmountPln > threshold;
  }

  /**
   * Check if date is today
   */
  private isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }
}
