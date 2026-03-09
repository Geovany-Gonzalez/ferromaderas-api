import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

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

  async create(data: { name: string; slug: string }): Promise<CategoryDto> {
    const c = await this.prisma.category.create({
      data: {
        name: data.name.trim(),
        slug: data.slug.trim().toLowerCase(),
      },
    });
    return this.toDto(c);
  }

  async update(
    id: string,
    data: { name?: string; slug?: string }
  ): Promise<CategoryDto | null> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) return null;
    const c = await this.prisma.category.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.slug && { slug: data.slug.trim().toLowerCase() }),
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

  private toDto(c: { id: string; name: string; slug: string }): CategoryDto {
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      imageUrl: '',
      description: '',
      active: true,
    };
  }
}
