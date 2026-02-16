import { api } from "./client";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export type SignUpDto = {
  email: string;
  fullName: string;
  phone?: string;
  roleId?: number;    
  password: string;
  billingInfo?: boolean;
};

export type SignInDto = {
  email: string;
  password: string;
};

export type JwtResponse = {
  token: string;
};

export async function signup(payload: SignUpDto) {
  const { data } = await axios.post<JwtResponse>(`${API_URL}/login/signup`, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return data;
}

export async function signin(payload: SignInDto) {
  const { data } = await api.post<JwtResponse>("/login/signin", payload);
  return data;
}
