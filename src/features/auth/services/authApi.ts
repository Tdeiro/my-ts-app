import { api } from "../../../shared/api/client";
import axios from "axios";
import type { JwtResponse, SignInDto, SignUpDto } from "../types/authTypes";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

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
