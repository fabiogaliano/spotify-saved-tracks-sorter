import { Database } from '~/types/database.types';
import { getSupabase } from '../services/DatabaseService';

export type AnalysisJob = Database['public']['Tables']['analysis_jobs']['Row'];
export type AnalysisJobInsert = Database['public']['Tables']['analysis_jobs']['Insert'];
export type AnalysisJobUpdate = Database['public']['Tables']['analysis_jobs']['Update'];
export type AnalysisJobStatus = Database['public']['Enums']['analysis_job_status'];

export class AnalysisJobRepository {
  async createJob(job: AnalysisJobInsert): Promise<AnalysisJob> {
    const { data, error } = await getSupabase()
      .from('analysis_jobs')
      .insert(job)
      .select()
      .single();

    if (error) {
      console.error('Error creating analysis job:', error);
      throw error;
    }

    return data;
  }

  async updateJob(id: string, updates: AnalysisJobUpdate): Promise<AnalysisJob> {
    const { data, error } = await getSupabase()
      .from('analysis_jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating analysis job:', error);
      throw error;
    }

    return data;
  }

  async getJobByBatchId(batchId: string): Promise<AnalysisJob | null> {
    const { data, error } = await getSupabase()
      .from('analysis_jobs')
      .select('*')
      .eq('batch_id', batchId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching analysis job by batch ID:', error);
      throw error;
    }

    return data;
  }

  async getActiveJobForUser(userId: number): Promise<AnalysisJob | null> {
    const { data, error } = await getSupabase()
      .from('analysis_jobs')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching active job for user:', error);
      throw error;
    }

    return data;
  }

  async updateJobProgress(
    batchId: string,
    tracksProcessed: number,
    tracksSucceeded: number,
    tracksFailed: number
  ): Promise<AnalysisJob> {
    const updates: AnalysisJobUpdate = {
      tracks_processed: tracksProcessed,
      tracks_succeeded: tracksSucceeded,
      tracks_failed: tracksFailed,
      updated_at: new Date().toISOString()
    };

    // Update status based on progress
    const job = await this.getJobByBatchId(batchId);
    if (job && tracksProcessed >= job.track_count) {
      updates.status = 'completed';
    } else if (job && tracksProcessed > 0) {
      updates.status = 'in_progress';
    }

    const { data, error } = await getSupabase()
      .from('analysis_jobs')
      .update(updates)
      .eq('batch_id', batchId)
      .select()
      .single();

    if (error) {
      console.error('Error updating job progress:', error);
      throw error;
    }

    return data;
  }

  async markJobAsCompleted(batchId: string): Promise<AnalysisJob> {
    return this.updateJob(batchId, {
      status: 'completed',
      updated_at: new Date().toISOString()
    });
  }

  async markJobAsFailed(batchId: string): Promise<AnalysisJob> {
    return this.updateJob(batchId, {
      status: 'failed',
      updated_at: new Date().toISOString()
    });
  }

  async deleteJob(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from('analysis_jobs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting analysis job:', error);
      throw error;
    }
  }

  async getUserJobs(userId: number, limit = 10): Promise<AnalysisJob[]> {
    const { data, error } = await getSupabase()
      .from('analysis_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user jobs:', error);
      throw error;
    }

    return data || [];
  }
}

export const analysisJobRepository = new AnalysisJobRepository();