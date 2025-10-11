export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class PaginationUtils {
  static getOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  static getPaginationInfo<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): PaginatedResult<T>['pagination'] {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  static validatePaginationOptions(options: PaginationOptions): PaginationOptions {
    const { page = 1, limit = 10, offset } = options;

    // Validate and clamp values
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100); // Max 100 items per page

    let validOffset: number;
    if (offset !== undefined) {
      validOffset = Math.max(0, offset);
    } else {
      validOffset = this.getOffset(validPage, validLimit);
    }

    return {
      page: validPage,
      limit: validLimit,
      offset: validOffset,
    };
  }
}
