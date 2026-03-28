import { api } from "../../../shared/api/client";
import type { EventDto } from "../types/eventTypes";

export async function createEvent(payload: EventDto) {
  const { data } = await api.post<EventDto>("/events", payload);
  return data;
}

export async function getEvents() {
  const { data } = await api.get<EventDto[]>("/events");
  return data;
}
