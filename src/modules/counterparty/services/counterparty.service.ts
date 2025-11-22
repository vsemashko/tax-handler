import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Counterparty } from '../entities/counterparty.entity';
import { NipValidatorService } from './nip-validator.service';
import { CreateCounterpartyDto, UpdateCounterpartyDto } from '../dto/counterparty.dto';

@Injectable()
export class CounterpartyService {
  constructor(
    @InjectRepository(Counterparty)
    private readonly counterpartyRepository: Repository<Counterparty>,
    private readonly nipValidatorService: NipValidatorService,
  ) {}

  /**
   * Create a new counterparty
   */
  async create(dto: CreateCounterpartyDto): Promise<Counterparty> {
    // Validate NIP if provided
    if (dto.nip) {
      this.nipValidatorService.validateOrThrow(dto.nip);

      // Check if NIP already exists
      const existing = await this.counterpartyRepository.findOne({
        where: { nip: this.nipValidatorService.clean(dto.nip) },
      });

      if (existing) {
        throw new ConflictException(`Counterparty with NIP ${dto.nip} already exists`);
      }
    }

    const counterparty = this.counterpartyRepository.create({
      ...dto,
      nip: dto.nip ? this.nipValidatorService.clean(dto.nip) : null,
      country: dto.country || 'PL',
      counterpartyType: dto.counterpartyType || 'customer',
      isEuEntity: dto.isEuEntity ?? false,
      isVatRegistered: dto.isVatRegistered ?? true,
      isActive: true,
    });

    return this.counterpartyRepository.save(counterparty);
  }

  /**
   * Find counterparty by ID
   */
  async findById(id: string): Promise<Counterparty> {
    const counterparty = await this.counterpartyRepository.findOne({
      where: { id, isActive: true },
    });

    if (!counterparty) {
      throw new NotFoundException(`Counterparty with ID ${id} not found`);
    }

    return counterparty;
  }

  /**
   * Find counterparty by NIP
   */
  async findByNip(nip: string): Promise<Counterparty | null> {
    const cleanNip = this.nipValidatorService.clean(nip);
    return this.counterpartyRepository.findOne({
      where: { nip: cleanNip, isActive: true },
    });
  }

  /**
   * Get all counterparties with optional filtering
   */
  async findAll(filters?: {
    type?: string;
    country?: string;
    search?: string;
    isVatRegistered?: boolean;
  }): Promise<Counterparty[]> {
    const query = this.counterpartyRepository.createQueryBuilder('counterparty');

    query.where('counterparty.isActive = :isActive', { isActive: true });

    if (filters?.type) {
      query.andWhere('counterparty.counterpartyType = :type', { type: filters.type });
    }

    if (filters?.country) {
      query.andWhere('counterparty.country = :country', { country: filters.country });
    }

    if (filters?.search) {
      query.andWhere(
        '(counterparty.name ILIKE :search OR counterparty.nip LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.isVatRegistered !== undefined) {
      query.andWhere('counterparty.isVatRegistered = :isVatRegistered', {
        isVatRegistered: filters.isVatRegistered,
      });
    }

    query.orderBy('counterparty.name', 'ASC');

    return query.getMany();
  }

  /**
   * Update counterparty
   */
  async update(id: string, dto: UpdateCounterpartyDto): Promise<Counterparty> {
    const counterparty = await this.findById(id);

    // Validate NIP if being updated
    if (dto.nip && dto.nip !== counterparty.nip) {
      this.nipValidatorService.validateOrThrow(dto.nip);

      // Check if new NIP already exists
      const existing = await this.counterpartyRepository.findOne({
        where: { nip: this.nipValidatorService.clean(dto.nip) },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(`Counterparty with NIP ${dto.nip} already exists`);
      }
    }

    Object.assign(counterparty, {
      ...dto,
      nip: dto.nip ? this.nipValidatorService.clean(dto.nip) : counterparty.nip,
    });

    return this.counterpartyRepository.save(counterparty);
  }

  /**
   * Soft delete counterparty
   */
  async delete(id: string): Promise<void> {
    const counterparty = await this.findById(id);
    counterparty.isActive = false;
    await this.counterpartyRepository.save(counterparty);
  }

  /**
   * Add bank account to counterparty
   */
  async addBankAccount(
    id: string,
    accountNumber: string,
    bankName?: string,
    isDefault?: boolean,
  ): Promise<Counterparty> {
    const counterparty = await this.findById(id);

    const bankAccounts = counterparty.bankAccounts || [];

    // If this is set as default, remove default flag from others
    if (isDefault) {
      bankAccounts.forEach((account) => {
        account.isDefault = false;
      });
    }

    bankAccounts.push({
      accountNumber,
      bankName,
      isDefault: isDefault ?? false,
      isVerified: false,
    });

    counterparty.bankAccounts = bankAccounts;

    return this.counterpartyRepository.save(counterparty);
  }

  /**
   * Verify bank account (after white list check)
   */
  async verifyBankAccount(id: string, accountNumber: string): Promise<Counterparty> {
    const counterparty = await this.findById(id);

    if (!counterparty.bankAccounts) {
      throw new NotFoundException('No bank accounts found');
    }

    const account = counterparty.bankAccounts.find((acc) => acc.accountNumber === accountNumber);

    if (!account) {
      throw new NotFoundException(`Bank account ${accountNumber} not found`);
    }

    account.isVerified = true;
    account.verifiedAt = new Date().toISOString();

    return this.counterpartyRepository.save(counterparty);
  }
}
