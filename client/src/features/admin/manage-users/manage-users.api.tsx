"use server";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export interface User {
  id: string;
  name: string;
  role: "STUDENT" | "TEACHER" | "SUPERVISOR" | "ADMIN";
  active: "ACTIVE" | "INACTIVE";
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
export const getUsers = async (
  params: GetUsersParams
): Promise<GetUsersResponse> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/students`, {
      params: {
        page: params.page || 1,
        limit: params.limit || 9,
        search: params.search || "",
        role: params.role || "",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

// Get user by ID
export const getUserById = async (id: string): Promise<User> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/students/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
};

// Create new user
export const createUser = async (userData: Omit<User, "id">): Promise<User> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/students`, userData);
    return response.data;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

// Update user
export interface UpdateUserPayload {
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
}

export const updateUser = async (
  id: string,
  userData: UpdateUserPayload
): Promise<User> => {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}/students/${id}`,
      userData
    );
    return response.data;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

// Delete user
export const deleteUser = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/students/${id}`);
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

// Change user active status
export const toggleUserStatus = async (
  id: string,   
  active: boolean
): Promise<User> => {
  try {
    // use students PATCH endpoint to update active flag
    const response = await axios.patch(`${API_BASE_URL}/students/${id}`, {
      is_active: active,
    });
    return response.data;
  } catch (error) {
    console.error("Error toggling user status:", error);
    throw error;
  }
};
