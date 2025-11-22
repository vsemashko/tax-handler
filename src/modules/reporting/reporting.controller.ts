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
import { GenerateVatReportDto } from './dto/vat-report.dto';
import { VatReport } from './entities/vat-report.entity';

@ApiTags('reporting')
@Controller('reports')
export class ReportingController {
  constructor(private readonly vatReportService: VatReportService) {}

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
}
