/**
 * Service for managing track analysis jobs
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '~/types/database.types';

// Type definitions for job status and related data
export type AnalysisJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AnalysisJob {
  id: number;
  userId: number;
  status: AnalysisJobStatus;
  createdAt: string;
  updatedAt: string;
  trackCount: number;
  tracksProcessed: number;
  tracksSucceeded: number;
  tracksFailed: number;
  completionPercentage: number;
}

export interface TrackAnalysisAttempt {
  id: number;
  jobId: number;
  trackId: number;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  errorType?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Service for interacting with analysis jobs
 */
export class AnalysisJobService {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  /**
   * Create a new analysis job for the specified tracks
   */
  async createJob(userId: number, trackIds: number[]): Promise<number> {
    if (!trackIds.length) {
      throw new Error('No tracks specified for analysis');
    }

    const { data, error } = await this.supabase.rpc('add_track_analysis_job', {
      p_user_id: userId,
      p_track_ids: trackIds
    });

    if (error) {
      throw new Error(`Failed to create analysis job: ${error.message}`);
    }

    return data as number;
  }

  /**
   * Get the latest analysis job for a user
   */
  async getLatestJob(userId: number): Promise<AnalysisJob | null> {
    const { data, error } = await this.supabase.rpc('get_latest_analysis_job', {
      p_user_id: userId
    });

    if (error) {
      throw new Error(`Failed to get latest analysis job: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return null;
    }

    const job = data[0];
    return {
      id: job.id,
      userId,
      status: job.status as AnalysisJobStatus,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      trackCount: job.track_count,
      tracksProcessed: job.tracks_processed,
      tracksSucceeded: job.tracks_succeeded,
      tracksFailed: job.tracks_failed,
      completionPercentage: job.completion_percentage
    };
  }

  /**
   * Get a specific analysis job by ID
   */
  async getJob(jobId: number): Promise<AnalysisJob | null> {
    const { data, error } = await this.supabase
      .from('analysis_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // PGRST116 is the error code for "No rows returned"
        return null;
      }
      throw new Error(`Failed to get analysis job: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    // Calculate completion percentage
    const completionPercentage = data.track_count > 0
      ? Math.floor((data.tracks_processed * 100) / data.track_count)
      : 0;

    return {
      id: data.id,
      userId: data.user_id,
      status: data.status as AnalysisJobStatus,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      trackCount: data.track_count,
      tracksProcessed: data.tracks_processed,
      tracksSucceeded: data.tracks_succeeded,
      tracksFailed: data.tracks_failed,
      completionPercentage
    };
  }

  /**
   * Get analysis attempts for a specific job
   */
  async getJobAttempts(jobId: number): Promise<TrackAnalysisAttempt[]> {
    const { data, error } = await this.supabase
      .from('track_analysis_attempts')
      .select('*')
      .eq('job_id', jobId);

    if (error) {
      throw new Error(`Failed to get job attempts: ${error.message}`);
    }

    return (data || []).map(attempt => ({
      id: attempt.id,
      jobId: attempt.job_id,
      trackId: attempt.track_id,
      status: attempt.status as 'pending' | 'processing' | 'succeeded' | 'failed',
      errorType: attempt.error_type || undefined,
      errorMessage: attempt.error_message || undefined,
      createdAt: attempt.created_at,
      updatedAt: attempt.updated_at
    }));
  }

  /**
   * Cancel an in-progress job
   * This will mark the job as failed and stop processing any pending tracks
   */
  async cancelJob(jobId: number): Promise<void> {
    const { error } = await this.supabase
      .from('analysis_jobs')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to cancel job: ${error.message}`);
    }

    // Update any pending or processing attempts to failed
    const { error: updateError } = await this.supabase
      .from('track_analysis_attempts')
      .update({
        status: 'failed',
        error_type: 'cancelled',
        error_message: 'Job was cancelled by user',
        updated_at: new Date().toISOString()
      })
      .eq('job_id', jobId)
      .in('status', ['pending', 'processing']);

    if (updateError) {
      console.error(`Failed to update attempts after cancellation: ${updateError.message}`);
    }
  }
}

// Create a singleton instance with environment variables
let analysisJobService: AnalysisJobService | null = null;

export function getAnalysisJobService(): AnalysisJobService {
  if (!analysisJobService) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not found in environment variables');
    }

    analysisJobService = new AnalysisJobService(supabaseUrl, supabaseKey);
  }

  return analysisJobService;
}
