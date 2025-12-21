import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface User {
    id: string;
    name: string;
    role: 'STUDENT' | 'TEACHER' | 'SUPERVISOR' | 'ADMIN';
    active: 'ACTIVE' | 'INACTIVE';
}

export interface GetUsersParams {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
}

export interface GetUsersResponse {
    data: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// Get all users with filters
export const getUsers = async (params: GetUsersParams): Promise<GetUsersResponse> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/admin/users`, {
            params: {
                page: params.page || 1,
                limit: params.limit || 9,
                search: params.search || '',
                role: params.role || '',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
};

// Get user by ID
export const getUserById = async (id: string): Promise<User> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/admin/users/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
    }
};

// Create new user
export const createUser = async (userData: Omit<User, 'id'>): Promise<User> => {
    try {
        const response = await axios.post(`${API_BASE_URL}/admin/users`, userData);
        return response.data;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

// Update user
export const updateUser = async (id: string, userData: Partial<User>): Promise<User> => {
    try {
        const response = await axios.put(`${API_BASE_URL}/admin/users/${id}`, userData);
        return response.data;
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
};

// Delete user
export const deleteUser = async (id: string): Promise<void> => {
    try {
        await axios.delete(`${API_BASE_URL}/admin/users/${id}`);
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
};

// Change user active status
export const toggleUserStatus = async (id: string, active: boolean): Promise<User> => {
    try {
        const response = await axios.patch(`${API_BASE_URL}/admin/users/${id}/status`, {
            active: active ? 'ACTIVE' : 'INACTIVE',
        });
        return response.data;
    } catch (error) {
        console.error('Error toggling user status:', error);
        throw error;
    }
};