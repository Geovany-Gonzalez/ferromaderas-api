import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ChatbotService } from './chatbot.service';
import { ChatMessageRequestDto, UpsertFaqDto } from './dto/chatbot.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbot: ChatbotService) {}

  // ----- Público (sitio web) -----

  /** Preguntas prelistadas para los botones del widget. */
  @Get('faqs')
  getFaqs() {
    return this.chatbot.getActiveFaqs();
  }

  /** Envía un mensaje del usuario y recibe la respuesta del asistente. */
  @Post('message')
  message(@Body() body: ChatMessageRequestDto, @Req() req: Request) {
    return this.chatbot.handleMessage(body.message, body.sessionId, {
      ip: req.ip ?? req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
      name: body.name,
    });
  }

  // ----- Admin (requiere permiso manage_chatbot) -----

  @Get('admin/faqs')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_chatbot')
  adminListFaqs() {
    return this.chatbot.adminListFaqs();
  }

  @Post('admin/faqs')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_chatbot')
  adminCreateFaq(@Body() body: UpsertFaqDto) {
    return this.chatbot.adminCreateFaq(body);
  }

  @Put('admin/faqs/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_chatbot')
  adminUpdateFaq(@Param('id') id: string, @Body() body: UpsertFaqDto) {
    return this.chatbot.adminUpdateFaq(id, body);
  }

  @Delete('admin/faqs/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_chatbot')
  adminDeleteFaq(@Param('id') id: string) {
    return this.chatbot.adminDeleteFaq(id);
  }

  @Get('admin/metrics')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_chatbot')
  adminMetrics() {
    return this.chatbot.adminMetrics();
  }

  @Get('admin/usage')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_chatbot')
  adminUsage() {
    return this.chatbot.adminUsageByDay();
  }

  @Get('admin/conversations')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_chatbot')
  adminConversations(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.chatbot.adminListConversations(
      page ? parseInt(page, 10) : undefined,
      pageSize ? parseInt(pageSize, 10) : undefined,
    );
  }

  @Get('admin/conversations/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_chatbot')
  adminConversation(@Param('id') id: string) {
    return this.chatbot.adminGetConversation(id);
  }
}
