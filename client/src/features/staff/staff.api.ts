import { api } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export type StaffRole = "STUDENT" | "INSTRUCTOR" | "ADMINISTRATOR";

export interface Staff {
  staff_users_id: string;
  first_name?: string;
  last_name?: string;
  role: StaffRole;
  email?: string;
  is_active: boolean;
}

export interface GetStaffsParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export interface GetStaffsResponse {
  data: Staff[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const getStaffs = async (
  params: GetStaffsParams = {},
): Promise<GetStaffsResponse> => {
  try {
    const response = await api.get(`/staff`, {
      params: {
        page: params.page || 1,
        limit: params.limit || 9,
        search: params.search || "",
        role: params.role || "",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching staffs:", error);
    throw error;
  }
};

export const getStaffById = async (id: string): Promise<Staff> => {
  try {
    const response = await api.get(`/staff/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching staff by id:", error);
    throw error;
  }
};
// Payload for creating a new staff user
export interface CreateStaffPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: "INSTRUCTOR" | "ADMIN";
  is_active?: boolean;
}

export const createStaff = async (
  payload: CreateStaffPayload,
): Promise<Staff> => {
  try {
    const response = await api.post(`/staff`, payload);
    return response.data;
  } catch (error) {
    console.error("Error creating staff:", error);
    throw error;
  }
};

export const updateStaff = async (
  id: string,
  payload: Partial<Omit<Staff, "staff_users_id">>,
): Promise<Staff> => {
  try {
    const response = await api.patch(`/staff/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error("Error updating staff:", error);
    throw error;
  }
};

export const deleteStaff = async (id: string): Promise<void> => {
  try {
    await api.delete(`/staff/${id}`);
  } catch (error) {
    console.error("Error deleting staff:", error);
    throw error;
  }
};

export const toggleStaffStatus = async (
  id: string,
  active: boolean,
): Promise<Staff> => {
  try {
    const response = await api.patch(`/staff/${id}`, {
      is_active: active,
    });
    return response.data;
  } catch (error) {
    console.error("Error toggling staff status:", error);
    throw error;
  }
};

/**
 * Check if email already exists
 * Used for frontend validation before form submission
 */
export const checkEmailExists = async (
  email: string,
  excludeId?: string,
): Promise<boolean> => {
  try {
    const params: any = { email };
    if (excludeId) params.excludeId = excludeId;

    const response = await api.get(`/staff/check-email`, {
      params,
    });
    return response.data.exists;
  } catch (error) {
    console.error("Error checking email:", error);
    return false;
  }
};
