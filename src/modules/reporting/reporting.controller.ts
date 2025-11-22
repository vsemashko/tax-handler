import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { VatReportService } from './services/vat-report.service';
import { CitReportService } from './services/cit-report.service';
import { GenerateVatReportDto } from './dto/vat-report.dto';
import { GenerateCitReportDto, RecordAdvancePaymentDto } from './dto/cit-report.dto';
import { VatReport } from './entities/vat-report.entity';
import { CitReport } from './entities/cit-report.entity';

@ApiTags('reporting')
@Controller('reports')
export class ReportingController {
  constructor(
    private readonly vatReportService: VatReportService,
    private readonly citReportService: CitReportService,
  ) {}

  @Post('vat/generate')
  @ApiOperation({ summary: 'Generate VAT report for a period' })
  @ApiResponse({ status: 201, description: 'VAT report generated', type: VatReport })
  @ApiResponse({ status: 400, description: 'Invalid input or report already exists' })
  async generateVatReport(@Body() dto: GenerateVatReportDto): Promise<VatReport> {
    return this.vatReportService.generateReport(
      dto.year,
      dto.month,
      dto.periodType || 'monthly',
    );
  }

  @Get('vat')
  @ApiOperation({ summary: 'Get all VAT reports' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({
    name: 'periodType',
    required: false,
    enum: ['monthly', 'quarterly'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['draft', 'finalized', 'submitted', 'accepted'],
  })
  @ApiResponse({ status: 200, description: 'List of VAT reports', type: [VatReport] })
  async getVatReports(
    @Query('year') year?: number,
    @Query('periodType') periodType?: string,
    @Query('status') status?: string,
  ): Promise<VatReport[]> {
    return this.vatReportService.findAll({
      year: year ? Number(year) : undefined,
      periodType,
      status,
    });
  }

  @Get('vat/:id')
  @ApiOperation({ summary: 'Get VAT report by ID' })
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiResponse({ status: 200, description: 'VAT report found', type: VatReport })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getVatReportById(@Param('id') id: string): Promise<VatReport> {
    return this.vatReportService.findById(id);
  }

  @Post('vat/:id/finalize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finalize VAT report (lock from changes)' })
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiResponse({ status: 200, description: 'Report finalized', type: VatReport })
  @ApiResponse({ status: 400, description: 'Report already finalized' })
  async finalizeVatReport(@Param('id') id: string): Promise<VatReport> {
    return this.vatReportService.finalizeReport(id);
  }

  @Post('vat/:id/generate-jpk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate JPK_VAT XML file for report' })
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiResponse({ status: 200, description: 'JPK_VAT XML generated', type: VatReport })
  @ApiResponse({ status: 400, description: 'Report must be finalized first' })
  async generateJpkVat(@Param('id') id: string): Promise<VatReport> {
    return this.vatReportService.generateJpkVat(id);
  }

  @Get('vat/:id/download-jpk')
  @Header('Content-Type', 'application/xml')
  @Header('Content-Disposition', 'attachment; filename="JPK_VAT.xml"')
  @ApiOperation({ summary: 'Download JPK_VAT XML file' })
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiResponse({ status: 200, description: 'JPK_VAT XML file' })
  @ApiResponse({ status: 404, description: 'Report or XML not found' })
  async downloadJpkVat(@Param('id') id: string): Promise<string> {
    const report = await this.vatReportService.findById(id);

    if (!report.jpkVatXml) {
      throw new Error('JPK_VAT XML not generated yet');
    }

    return report.jpkVatXml;
  }

  @Delete('vat/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete VAT report (only draft reports)' })
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiResponse({ status: 204, description: 'Report deleted' })
  @ApiResponse({ status: 400, description: 'Only draft reports can be deleted' })
  async deleteVatReport(@Param('id') id: string): Promise<void> {
    await this.vatReportService.delete(id);
  }

  // CIT Reports

  @Post('cit/generate')
  @ApiOperation({ summary: 'Generate CIT report for a tax year' })
  @ApiResponse({ status: 201, description: 'CIT report generated', type: CitReport })
  @ApiResponse({ status: 400, description: 'Invalid input or report already exists' })
  async generateCitReport(@Body() dto: GenerateCitReportDto): Promise<CitReport> {
    return this.citReportService.generateReport(dto.taxYear);
  }

  @Get('cit')
  @ApiOperation({ summary: 'Get all CIT reports' })
  @ApiResponse({ status: 200, description: 'List of CIT reports', type: [CitReport] })
  async getCitReports(): Promise<CitReport[]> {
    return this.citReportService.findAll();
  }

  @Get('cit/:id')
  @ApiOperation({ summary: 'Get CIT report by ID' })
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiResponse({ status: 200, description: 'CIT report found', type: CitReport })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getCitReportById(@Param('id') id: string): Promise<CitReport> {
    return this.citReportService.findById(id);
  }

  @Get('cit/year/:year')
  @ApiOperation({ summary: 'Get CIT report by tax year' })
  @ApiParam({ name: 'year', description: 'Tax year', example: 2025 })
  @ApiResponse({ status: 200, description: 'CIT report found', type: CitReport })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getCitReportByYear(@Param('year') year: number): Promise<CitReport | null> {
    return this.citReportService.findByYear(Number(year));
  }

  @Post('cit/:id/finalize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finalize CIT report' })
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiResponse({ status: 200, description: 'Report finalized', type: CitReport })
  @ApiResponse({ status: 400, description: 'Report already finalized' })
  async finalizeCitReport(@Param('id') id: string): Promise<CitReport> {
    return this.citReportService.finalizeReport(id);
  }

  @Post('cit/:id/advance-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record CIT advance payment' })
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiResponse({ status: 200, description: 'Advance payment recorded', type: CitReport })
  async recordAdvancePayment(
    @Param('id') id: string,
    @Body() dto: RecordAdvancePaymentDto,
  ): Promise<CitReport> {
    return this.citReportService.recordAdvancePayment(id, dto.amount);
  }

  @Post('cit/:id/generate-jpk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate JPK_CIT XML file (for large companies)' })
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiResponse({ status: 200, description: 'JPK_CIT XML generated', type: CitReport })
  @ApiResponse({ status: 400, description: 'Report must be finalized first' })
  async generateJpkCit(@Param('id') id: string): Promise<CitReport> {
    return this.citReportService.generateJpkCit(id);
  }

  @Get('cit/:id/download-jpk')
  @Header('Content-Type', 'application/xml')
  @Header('Content-Disposition', 'attachment; filename="JPK_CIT.xml"')
  @ApiOperation({ summary: 'Download JPK_CIT XML file' })
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiResponse({ status: 200, description: 'JPK_CIT XML file' })
  @ApiResponse({ status: 404, description: 'Report or XML not found' })
  async downloadJpkCit(@Param('id') id: string): Promise<string> {
    const report = await this.citReportService.findById(id);

    if (!report.jpkCitXml) {
      throw new Error('JPK_CIT XML not generated yet');
    }

    return report.jpkCitXml;
  }

  @Get('cit/:id/analysis')
  @ApiOperation({ summary: 'Get CIT analysis for a tax year' })
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiResponse({
    status: 200,
    description: 'CIT analysis',
    schema: {
      type: 'object',
      properties: {
        taxYear: { type: 'number', example: 2025 },
        revenue: { type: 'number', example: 5000000 },
        costs: { type: 'number', example: 3500000 },
        profitMargin: { type: 'number', example: 30.0 },
        effectiveTaxRate: { type: 'number', example: 5.7 },
        smallTaxpayerEligible: { type: 'boolean', example: true },
        savingsIfSmallTaxpayer: { type: 'number', example: 150000 },
      },
    },
  })
  async getCitAnalysis(@Param('id') id: string) {
    const report = await this.citReportService.findById(id);
    return this.citReportService.getAnalysis(report.taxYear);
  }

  @Delete('cit/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete CIT report (only drafts)' })
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiResponse({ status: 204, description: 'Report deleted' })
  @ApiResponse({ status: 400, description: 'Only draft reports can be deleted' })
  async deleteCitReport(@Param('id') id: string): Promise<void> {
    await this.citReportService.delete(id);
  }
}
