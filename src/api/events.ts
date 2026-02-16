import { api } from "./client";

export type EventDto = {
  id?: number;
  userId?: number;
  name: string;
  eventType: string;
  sport?: string;
  format?: string;
  level?: string;
  timezone: string;
  locationName?: string;
  address?: string;
  startDate: string; 
  endDate?: string;
  startTime?: string;
  endTime?: string;
  registrationDeadline?: string;
  capacity?: number;
  entryFee?: number;
  currency?: string;
  description?: string;
  isPublic?: boolean;
  allowWaitlist?: boolean;
  requireApproval?: boolean;
};

export async function createEvent(payload: EventDto) {
  const { data } = await api.post<EventDto>("/events", payload);
  return data;
}

export async function getEvents() {
  const { data } = await api.get<EventDto[]>("/events");
  return data;
}
