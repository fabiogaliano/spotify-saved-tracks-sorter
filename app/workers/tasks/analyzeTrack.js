/**
 * Task handler for analyzing a single track
 */

const { createSongAnalysisService } = require('~/lib/utils/analysisUtils');
const { createClient } = require('@supabase/supabase-js');
const { createErrorInfo, logError } = require('../utils/errorHandling');

/**
 * Task handler for analyzing a single track
 * This is executed by the worker when a track analysis job is queued
 */
async function analyzeTrack(payload, helpers) {
  const { jobId, trackId, userId } = payload;
  const { logger } = helpers;

  logger.info(`Starting analysis for track ${trackId} (Job ${jobId})`);

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not found in environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Update attempt status to 'processing'
    await updateAttemptStatus(supabase, jobId, trackId, 'processing');

    // Get track details from database
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      throw new Error(`Failed to retrieve track: ${trackError?.message || 'Track not found'}`);
    }

    // Create analysis service with user's provider key
    const analysisService = await createSongAnalysisService(userId);

    // Analyze the track
    const analysis = await analysisService.analyzeSong(track.artist, track.name);

    // Store analysis results
    const { error: insertError } = await supabase
      .from('track_analyses')
      .upsert({
        track_id: trackId,
        user_id: userId,
        analysis: analysis,
        model_name: 'default', // This should be retrieved from the analysis service
        version: 1 // This should be a constant or configuration value
      });

    if (insertError) {
      throw new Error(`Failed to store analysis: ${insertError.message}`);
    }

    // Update attempt status to 'succeeded'
    await updateAttemptStatus(supabase, jobId, trackId, 'succeeded');

    // Update job progress
    await updateJobProgress(supabase, jobId);

    logger.info(`Successfully analyzed track ${trackId} (Job ${jobId})`);
  } catch (error) {
    // Create standardized error info
    const errorInfo = createErrorInfo(error, { jobId, trackId, userId });

    // Log the error
    logError(logger, errorInfo);

    // Update attempt status to 'failed' with error information
    await updateAttemptStatus(
      supabase,
      jobId,
      trackId,
      'failed',
      errorInfo.category,
      errorInfo.message
    );

    // Update job progress
    await updateJobProgress(supabase, jobId);

    // Rethrow to let graphile-worker handle retries if configured
    throw error;
  }
}

/**
 * Update the status of a track analysis attempt
 */
async function updateAttemptStatus(
  supabase,
  jobId,
  trackId,
  status,
  errorType,
  errorMessage
) {
  const { error } = await supabase
    .from('track_analysis_attempts')
    .update({
      status,
      error_type: errorType,
      error_message: errorMessage,
      updated_at: new Date().toISOString()
    })
    .eq('job_id', jobId)
    .eq('track_id', trackId);

  if (error) {
    console.error(`Failed to update attempt status: ${error.message}`);
  }
}

/**
 * Update the progress counters for a job
 */
async function updateJobProgress(
  supabase,
  jobId
) {
  // Get current counts of tracks in different states
  const { data, error } = await supabase
    .from('track_analysis_attempts')
    .select('status')
    .eq('job_id', jobId);

  if (error || !data) {
    console.error(`Failed to get attempt counts: ${error?.message}`);
    return;
  }

  // Count tracks in each status
  const counts = data.reduce((acc, attempt) => {
    acc[attempt.status] = (acc[attempt.status] || 0) + 1;
    return acc;
  }, {});

  // Calculate totals
  const tracksProcessed = (counts['succeeded'] || 0) + (counts['failed'] || 0);
  const tracksSucceeded = counts['succeeded'] || 0;
  const tracksFailed = counts['failed'] || 0;
  const trackCount = data.length;

  // Determine overall job status
  let status = 'processing';
  if (tracksProcessed === trackCount) {
    status = tracksFailed === trackCount ? 'failed' : 'completed';
  }

  // Update the job record
  const { error: updateError } = await supabase
    .from('analysis_jobs')
    .update({
      status,
      tracks_processed: tracksProcessed,
      tracks_succeeded: tracksSucceeded,
      tracks_failed: tracksFailed,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);

  if (updateError) {
    console.error(`Failed to update job progress: ${updateError.message}`);
  }

  // If all tracks are processed, queue the finishAnalysisJob task
  if (tracksProcessed === trackCount) {
    try {
      // Add job to finish the analysis job
      await supabase.rpc('graphile_worker.add_job', {
        identifier: 'finishAnalysisJob',
        payload: { jobId, userId: null } // userId will be retrieved in the finishAnalysisJob task
      });
    } catch (error) {
      console.error(`Failed to queue finishAnalysisJob: ${error}`);
    }
  }
}

// Export the task handler for Graphile Worker
module.exports = analyzeTrack;
