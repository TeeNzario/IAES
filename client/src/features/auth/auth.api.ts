import { apiFetch } from "@/lib/api";
import { LoginDto } from "@/types/login";

//temporary interface ***
interface LoginResponse {
  access_token: string;
  student: {
    student_code: string;
    first_name: string;
    last_name: string;
  };
}


export function login(data: LoginDto) {
    return apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        data,
    });
}