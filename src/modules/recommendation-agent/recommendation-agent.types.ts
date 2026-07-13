import { ProductDto } from '../products/products.service';

export type RecommendationTipo = 'complementario' | 'alternativo' | 'relacionado';

export type RecommendationFuente =
  | 'consulta'
  | 'categoria'
  | 'co_ocurrencia'
  | 'popularidad'
  | 'destacado';

export interface RecommendationAgentInput {
  /** Consulta del cliente (búsqueda o intención en texto). */
  query?: string;
  /** Producto que está viendo o seleccionando. */
  productId?: string;
  /** Categoría en contexto (página de categoría o del producto). */
  categoryId?: string;
  /** Códigos de productos ya en el carrito (consulta implícita). */
  cartCodes?: string[];
  limit?: number;
}

export interface RecommendationItem {
  product: ProductDto;
  score: number;
  tipo: RecommendationTipo;
  razon: string;
  fuentes: RecommendationFuente[];
}

export interface RecommendationAgentMeta {
  consulta?: string;
  categoriaId?: string;
  productoContextoId?: string;
  productoContextoCodigo?: string;
  carritoCodigos: string[];
  fuentesDatos: string[];
  algoritmo: string;
  generadoEn: string;
}

export interface RecommendationAgentResponse {
  recomendaciones: RecommendationItem[];
  meta: RecommendationAgentMeta;
}
