import { User } from '../User';

export interface PaginatedResponse<T> {
    meta: {
        total: number
        perPage: number
        currentPage: number
        lastPage: number
        firstPageUrl: string
        lastPageUrl: string
        nextPageUrl: string | null
        previousPageUrl: string | null
    }
    data: T[]
}

export interface UserPaginatedResponse extends PaginatedResponse<User> { }
