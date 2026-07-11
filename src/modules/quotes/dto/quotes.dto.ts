import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { QUOTE_STATUSES, QuoteStatus } from '../quotes.service';

export class CreateQuoteItemDto {
  @IsOptional()
  @IsString()
  productoId?: string;

  @IsString()
  @MaxLength(120)
  codigo!: string;

  @IsString()
  @MaxLength(300)
  nombre!: string;

  @IsNumber()
  @Min(0)
  precioUnitario!: number;

  @IsInt()
  @Min(1)
  cantidad!: number;
}

export class CreateQuoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  clienteNombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  clienteTelefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  clienteDireccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  clienteNota?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteItemDto)
  items!: CreateQuoteItemDto[];
}

export class UpdateStatusDto {
  @IsIn(QUOTE_STATUSES as unknown as string[])
  estado!: QuoteStatus;
}

export class AssignVendedorDto {
  @IsOptional()
  @IsString()
  vendedorId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  vendedorNombre?: string | null;
}
