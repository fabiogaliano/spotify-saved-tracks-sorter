/**
 * WebSocket message types for the analysis system
 */

// Base message structure
interface BaseMessage {
  timestamp?: string;
}

// Connection status message
export interface ConnectionMessage extends BaseMessage {
  type: 'connected';
  message: string;
}

// Job status update from worker
export interface JobStatusMessage extends BaseMessage {
  type: 'job_status';
  data: {
    jobId: string;
    trackId: number;
    status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
    progress?: number;
    error?: string;
  };
}

// Direct notification from worker (non-nested format)
export interface DirectJobNotification extends BaseMessage {
  jobId: string;
  trackId: number;
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  progress?: number;
  error?: string;
}

// Legacy analysis update message
export interface AnalysisUpdateMessage extends BaseMessage {
  type: 'analysis_update';
  trackId: string | number;
  analysis: any; // TODO: Type this with actual analysis structure
}

// Legacy analysis failed message
export interface AnalysisFailedMessage extends BaseMessage {
  type: 'analysis_failed';
  trackId: string | number;
  error?: string;
}

// Job completion message
export interface JobCompletionMessage extends BaseMessage {
  type: 'job_completed';
  jobId: string;
  status: 'completed' | 'failed';
  stats: {
    totalTracks: number;
    tracksProcessed: number;
    tracksSucceeded: number;
    tracksFailed: number;
  };
}

// Batch tracks notification
export interface BatchTracksNotification extends BaseMessage {
  type: 'batch_tracks_queued';
  jobId: string;
  trackIds: number[];
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

// Union type for all possible WebSocket messages
export type WebSocketMessage = 
  | ConnectionMessage 
  | JobStatusMessage 
  | DirectJobNotification
  | AnalysisUpdateMessage 
  | AnalysisFailedMessage
  | JobCompletionMessage
  | BatchTracksNotification;

// Type guards
export function isConnectionMessage(msg: any): msg is ConnectionMessage {
  return msg?.type === 'connected';
}

export function isJobStatusMessage(msg: any): msg is JobStatusMessage {
  return msg?.type === 'job_status' && msg?.data;
}

export function isDirectJobNotification(msg: any): msg is DirectJobNotification {
  return msg?.jobId && msg?.trackId && msg?.status && !msg?.type;
}

export function isAnalysisUpdateMessage(msg: any): msg is AnalysisUpdateMessage {
  return msg?.type === 'analysis_update' && msg?.trackId;
}

export function isAnalysisFailedMessage(msg: any): msg is AnalysisFailedMessage {
  return msg?.type === 'analysis_failed' && msg?.trackId;
}

export function isJobCompletionMessage(msg: any): msg is JobCompletionMessage {
  return msg?.type === 'job_completed' && msg?.jobId;
}

export function isBatchTracksNotification(msg: any): msg is BatchTracksNotification {
  return msg?.type === 'batch_tracks_queued' && msg?.jobId && Array.isArray(msg?.trackIds);
}