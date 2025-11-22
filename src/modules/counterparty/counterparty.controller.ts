import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CounterpartyService } from './services/counterparty.service';
import { NipValidatorService } from './services/nip-validator.service';
import {
  CreateCounterpartyDto,
  UpdateCounterpartyDto,
  AddBankAccountDto,
} from './dto/counterparty.dto';
import { Counterparty } from './entities/counterparty.entity';

@ApiTags('counterparties')
@Controller('counterparties')
export class CounterpartyController {
  constructor(
    private readonly counterpartyService: CounterpartyService,
    private readonly nipValidatorService: NipValidatorService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new counterparty' })
  @ApiResponse({ status: 201, description: 'Counterparty created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'NIP already exists' })
  async create(@Body() dto: CreateCounterpartyDto): Promise<Counterparty> {
    return this.counterpartyService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all counterparties' })
  @ApiQuery({ name: 'type', required: false, enum: ['customer', 'supplier', 'both'] })
  @ApiQuery({ name: 'country', required: false, example: 'PL' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or NIP' })
  @ApiQuery({ name: 'isVatRegistered', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of counterparties', type: [Counterparty] })
  async findAll(
    @Query('type') type?: string,
    @Query('country') country?: string,
    @Query('search') search?: string,
    @Query('isVatRegistered') isVatRegistered?: boolean,
  ): Promise<Counterparty[]> {
    return this.counterpartyService.findAll({
      type,
      country,
      search,
      isVatRegistered,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get counterparty by ID' })
  @ApiParam({ name: 'id', description: 'Counterparty UUID' })
  @ApiResponse({ status: 200, description: 'Counterparty found', type: Counterparty })
  @ApiResponse({ status: 404, description: 'Counterparty not found' })
  async findById(@Param('id') id: string): Promise<Counterparty> {
    return this.counterpartyService.findById(id);
  }

  @Get('nip/:nip')
  @ApiOperation({ summary: 'Get counterparty by NIP' })
  @ApiParam({ name: 'nip', description: 'Polish NIP number' })
  @ApiResponse({ status: 200, description: 'Counterparty found', type: Counterparty })
  @ApiResponse({ status: 404, description: 'Counterparty not found' })
  async findByNip(@Param('nip') nip: string): Promise<Counterparty | null> {
    return this.counterpartyService.findByNip(nip);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update counterparty' })
  @ApiParam({ name: 'id', description: 'Counterparty UUID' })
  @ApiResponse({ status: 200, description: 'Counterparty updated', type: Counterparty })
  @ApiResponse({ status: 404, description: 'Counterparty not found' })
  @ApiResponse({ status: 409, description: 'NIP already exists' })
  async update(@Param('id') id: string, @Body() dto: UpdateCounterpartyDto): Promise<Counterparty> {
    return this.counterpartyService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete counterparty (soft delete)' })
  @ApiParam({ name: 'id', description: 'Counterparty UUID' })
  @ApiResponse({ status: 204, description: 'Counterparty deleted' })
  @ApiResponse({ status: 404, description: 'Counterparty not found' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.counterpartyService.delete(id);
  }

  @Post(':id/bank-accounts')
  @ApiOperation({ summary: 'Add bank account to counterparty' })
  @ApiParam({ name: 'id', description: 'Counterparty UUID' })
  @ApiResponse({ status: 201, description: 'Bank account added', type: Counterparty })
  async addBankAccount(
    @Param('id') id: string,
    @Body() dto: AddBankAccountDto,
  ): Promise<Counterparty> {
    return this.counterpartyService.addBankAccount(
      id,
      dto.accountNumber,
      dto.bankName,
      dto.isDefault,
    );
  }

  @Post(':id/bank-accounts/:accountNumber/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify bank account (mark as verified after white list check)' })
  @ApiParam({ name: 'id', description: 'Counterparty UUID' })
  @ApiParam({ name: 'accountNumber', description: 'Bank account number' })
  @ApiResponse({ status: 200, description: 'Bank account verified', type: Counterparty })
  async verifyBankAccount(
    @Param('id') id: string,
    @Param('accountNumber') accountNumber: string,
  ): Promise<Counterparty> {
    return this.counterpartyService.verifyBankAccount(id, accountNumber);
  }

  @Get('validate/nip/:nip')
  @ApiOperation({ summary: 'Validate NIP number' })
  @ApiParam({ name: 'nip', description: 'NIP number to validate' })
  @ApiResponse({
    status: 200,
    description: 'NIP validation result',
    schema: {
      type: 'object',
      properties: {
        nip: { type: 'string', example: '1234563218' },
        isValid: { type: 'boolean', example: true },
        formatted: { type: 'string', example: '123-456-32-18' },
      },
    },
  })
  async validateNip(@Param('nip') nip: string) {
    const isValid = this.nipValidatorService.validate(nip);
    return {
      nip: this.nipValidatorService.clean(nip),
      isValid,
      formatted: isValid ? this.nipValidatorService.format(nip) : null,
    };
  }
}
