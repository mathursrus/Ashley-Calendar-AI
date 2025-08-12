// Calendar service types and interfaces

export interface BusySlot {
  start: Date;
  end: Date;
  status: 'busy' | 'tentative' | 'out_of_office';
}

export interface FreeBusyResult {
  email: string;
  status: 'success' | 'access_denied' | 'not_found' | 'error';
  busySlots?: BusySlot[];
  errorMessage?: string;
}

export interface AvailableSlot {
  start: Date;
  end: Date;
  duration: number; // in minutes
}

export interface ParticipantAvailability {
  email: string;
  hasApiAccess: boolean;
  availableSlots: AvailableSlot[];
  busySlots: BusySlot[];
  errorMessage?: string;
}

export interface AvailabilityResult {
  commonAvailableSlots: AvailableSlot[];
  participantData: ParticipantAvailability[];
  hasApiAccess: boolean;
  requiresManualCoordination: string[]; // emails needing manual confirmation
  summary: string; // formatted summary for BAML
}

export interface CalendarService {
  getFreeBusy(
    email: string,
    startTime: Date,
    endTime: Date
  ): Promise<FreeBusyResult>;
}
