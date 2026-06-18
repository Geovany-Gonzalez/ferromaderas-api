import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Cuerpo de POST /api/chatbot/message (público). */
export class ChatMessageRequestDto {
  @IsString()
  @MinLength(1, { message: 'El mensaje no puede estar vacío.' })
  @MaxLength(500, { message: 'El mensaje es demasiado largo.' })
  message!: string;

  /** Identificador de sesión del navegador (para agrupar el historial). */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sessionId?: string;

  /** Nombre del visitante (opcional) para personalizar la respuesta. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  name?: string;
}

/** Crear/editar una FAQ desde el panel admin. */
export class UpsertFaqDto {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  question!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  answer!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  keywords?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
