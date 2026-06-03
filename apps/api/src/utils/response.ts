import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: PaginationMeta;
}

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  success: boolean,
  message?: string,
  data?: T,
  pagination?: PaginationMeta,
) => {
  const responsePayload: ApiResponse<T> = {
    success,
    message,
    data,
  };

  if (pagination) {
    responsePayload.pagination = pagination;
  }

  return res.status(statusCode).json(responsePayload);
};

// Standard helper to extract query pagination parameters
export const parsePagination = (query: any) => {
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 10;
  const search = (query.search as string) || '';
  const sortBy = (query.sortBy as string) || 'createdAt';
  const sortDir = (query.sortDir as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc';

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    search,
    sortBy,
    sortDir,
    skip,
  };
};
