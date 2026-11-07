import type { Game } from './game';

export type ApiGame = Omit<Game, 'featured'>;

export interface ApiResponse<T> {
  data: T;
}

export interface ApiCollectionResponse<T, Metadata> extends ApiResponse<T[]> {
  meta: Metadata;
}

export interface GameCategory {
  slug: string;
  label: string;
  isDefault: boolean;
}

export type CategoriesResponse = ApiCollectionResponse<
  GameCategory,
  { totalItems: number; description?: string }
>;

export type GameSort = 'rating-desc' | 'rating-asc' | 'name-asc' | 'name-desc';

export interface LibraryQuery {
  category: string;
  sort: GameSort;
  page: number;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export type LibraryGamesResponse = ApiCollectionResponse<
  ApiGame,
  PaginationMetadata & { appliedFilter: Pick<LibraryQuery, 'category' | 'sort'> }
>;

export type FeaturedGamesResponse = ApiCollectionResponse<
  ApiGame,
  PaginationMetadata & { appliedFilter: { featured: boolean } }
>;

export interface GameRecord {
  position: number;
  playerName: string;
  score: number;
  achievedAt: string;
}

export interface GameDetailsData {
  slug: string;
  name: string;
  heroImage: string;
  rating: number;
  likesCount: number;
  isLikedByCurrentUser: boolean;
  fullDescription: string;
  specs: {
    genre: string;
    players: string;
    duration: string;
    price: string;
  };
  topRecords: GameRecord[];
}

export type GameDetailsResponse = ApiResponse<GameDetailsData>;

export interface GameComment {
  commentId: string;
  authorName: string;
  text: string;
  likesCount: number;
  isLikedByCurrentUser: boolean;
  createdAt: string;
}

export type GameCommentsResponse = ApiCollectionResponse<
  GameComment,
  { totalComments: number; returnedCount: number; sort: 'newest' | 'oldest' }
>;
