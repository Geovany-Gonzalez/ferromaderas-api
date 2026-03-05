import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

export interface PolicySectionDto {
  id: string;
  title: string;
  content: string[];
  icon: string;
}

export interface PolicyPageDto {
  title: string;
  subtitle: string;
  policies: PolicySectionDto[];
}

@Injectable()
export class PoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Obtiene la página de políticas (pública, sin auth) */
  async getPage(): Promise<PolicyPageDto> {
    const page = await this.prisma.policyPage.findFirst({
      orderBy: { id: 'asc' },
      include: {
        sections: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!page) {
      return this.getDefaultPage();
    }

    const content = (val: unknown): string[] => {
      if (Array.isArray(val) && val.every((x) => typeof x === 'string')) {
        return val as string[];
      }
      return [];
    };

    return {
      title: page.title,
      subtitle: page.subtitle,
      policies: page.sections.map((s) => ({
        id: s.id,
        title: s.title,
        content: content(s.content),
        icon: s.iconUrl ?? '',
      })),
    };
  }

  /** Actualiza la página de políticas (requiere auth) */
  async updatePage(dto: PolicyPageDto): Promise<PolicyPageDto> {
    const POLICY_COUNT = 6;
    const policies = (dto.policies ?? []).slice(0, POLICY_COUNT);

    let page = await this.prisma.policyPage.findFirst({
      orderBy: { id: 'asc' },
      include: { sections: true },
    });

    if (!page) {
      page = await this.prisma.policyPage.create({
        data: {
          title: dto.title || 'Políticas de compra',
          subtitle: dto.subtitle || '',
        },
        include: { sections: true },
      });
    }

    // Eliminar secciones existentes y crear las nuevas
    await this.prisma.policySection.deleteMany({
      where: { pageId: page.id },
    });

    const defaultPolicies = this.getDefaultPolicies();
    for (let i = 0; i < POLICY_COUNT; i++) {
      const p = policies[i] ?? defaultPolicies[i];
      await this.prisma.policySection.create({
        data: {
          pageId: page.id,
          title: p?.title ?? `Política ${i + 1}`,
          content: p?.content ?? [],
          iconUrl: p?.icon || null,
          order: i,
        },
      });
    }

    await this.prisma.policyPage.update({
      where: { id: page.id },
      data: {
        title: dto.title ?? page.title,
        subtitle: dto.subtitle ?? page.subtitle,
      },
    });

    return this.getPage();
  }

  private getDefaultPage(): PolicyPageDto {
    const policies = this.getDefaultPolicies();
    return {
      title: 'Políticas de compra',
      subtitle: 'Leé estas condiciones antes de confirmar tu pedido por WhatsApp.',
      policies,
    };
  }

  private getDefaultPolicies(): PolicySectionDto[] {
    return [
      {
        id: '',
        title: 'Precios y vigencia',
        icon: '/assets/icons/placeholder-price.png',
        content: [
          'Los precios pueden variar sin previo aviso.',
          'La cotización se confirma al finalizar por WhatsApp.',
        ],
      },
      {
        id: '',
        title: 'Envío y flete',
        icon: '/assets/icons/placeholder-delivery.png',
        content: [
          'El flete depende de zona/distancia/productos.',
          'Se confirma antes de cerrar el pedido.',
        ],
      },
      {
        id: '',
        title: 'Cambios y devoluciones',
        icon: '/assets/icons/placeholder-returns.png',
        content: [
          'No se aceptan cambios ni devoluciones tras la entrega.',
          'Aplica revisión al recibir.',
        ],
      },
      {
        id: '',
        title: 'Disponibilidad',
        icon: '/assets/icons/placeholder-stock.png',
        content: [
          'Productos sujetos a stock.',
          'Si se agota el producto, el vendedor por vía Whatsapp te ofrecerá la mejor alternativa.',
        ],
      },
      {
        id: '',
        title: 'Métodos de pago',
        icon: '/assets/icons/placeholder-payment.png',
        content: [
          'Los métodos de pago son únicamente los siguientes:',
          'Efectivo.',
          'Transferencia',
        ],
      },
      {
        id: '',
        title: 'Horarios',
        icon: '/assets/icons/placeholder-schedule.png',
        content: [
          'Lunes a sábado 7:30 am – 5:30 pm.',
          'Fuera de horario se atiende el siguiente día hábil.',
        ],
      },
    ];
  }
}
