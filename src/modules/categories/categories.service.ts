import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { Category as PrismaCategory } from '@prisma/client';

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  description?: string;
  active: boolean;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CategoryDto[]> {
    const list = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return list.map((c) => this.toDto(c));
  }

  async findBySlug(slug: string): Promise<CategoryDto | null> {
    const c = await this.prisma.category.findUnique({
      where: { slug },
    });
    return c ? this.toDto(c) : null;
  }

  async findById(id: string): Promise<CategoryDto | null> {
    const c = await this.prisma.category.findUnique({
      where: { id },
    });
    return c ? this.toDto(c) : null;
  }

  async create(data: {
    name: string;
    slug: string;
    imageUrl?: string;
    description?: string;
    active?: boolean;
  }): Promise<CategoryDto> {
    const c = await this.prisma.category.create({
      data: {
        name: data.name.trim(),
        slug: data.slug.trim().toLowerCase(),
        imageUrl: this.normalizeOptionalText(data.imageUrl),
        description: this.normalizeOptionalText(data.description),
        active: data.active ?? true,
      },
    });
    return this.toDto(c);
  }

  async update(
    id: string,
    data: {
      name?: string;
      slug?: string;
      imageUrl?: string | null;
      description?: string | null;
      active?: boolean;
    }
  ): Promise<CategoryDto | null> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) return null;
    const c = await this.prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.slug !== undefined && {
          slug: data.slug.trim().toLowerCase(),
        }),
        ...(data.imageUrl !== undefined && {
          imageUrl: this.normalizeOptionalText(data.imageUrl),
        }),
        ...(data.description !== undefined && {
          description: this.normalizeOptionalText(data.description),
        }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });
    return this.toDto(c);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.category.deleteMany({
      where: { id },
    });
    return result.count > 0;
  }

  private normalizeOptionalText(
    value: string | null | undefined
  ): string | null {
    if (value === null || value === undefined) return null;
    const t = String(value).trim();
    return t.length ? t : null;
  }

  private toDto(c: PrismaCategory): CategoryDto {
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      imageUrl: c.imageUrl ?? '',
      description: c.description ?? '',
      active: c.active,
    };
  }
}
