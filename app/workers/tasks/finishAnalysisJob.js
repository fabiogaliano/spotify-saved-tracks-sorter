/**
 * Task handler for finalizing an analysis job after all tracks are processed
 */

const { createClient } = require('@supabase/supabase-js');
const { createErrorInfo, logError } = require('../utils/errorHandling');

/**
 * Task handler for finalizing a job after all tracks are processed
 * This is executed by the worker when all tracks in a job have been analyzed
 */
async function finishAnalysisJob(payload, helpers) {
  const { jobId } = payload;
  const { logger } = helpers;

  logger.info(`Finalizing analysis job ${jobId}`);

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not found in environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('analysis_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Failed to retrieve job: ${jobError?.message || 'Job not found'}`);
    }

    // Double-check that all tracks are processed
    const { data: attempts, error: attemptsError } = await supabase
      .from('track_analysis_attempts')
      .select('status')
      .eq('job_id', jobId);

    if (attemptsError) {
      throw new Error(`Failed to retrieve attempts: ${attemptsError.message}`);
    }

    const pendingCount = attempts.filter(a => ['pending', 'processing'].includes(a.status)).length;

    if (pendingCount > 0) {
      logger.warn(`Job ${jobId} has ${pendingCount} pending tracks but finishAnalysisJob was called`);
      return; // Exit without finalizing if there are still pending tracks
    }

    // Generate summary statistics
    const successCount = attempts.filter(a => a.status === 'succeeded').length;
    const failCount = attempts.filter(a => a.status === 'failed').length;
    const totalCount = attempts.length;
    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

    // Update job status to 'completed'
    const { error: updateError } = await supabase
      .from('analysis_jobs')
      .update({
        status: failCount === totalCount ? 'failed' : 'completed',
        tracks_processed: totalCount,
        tracks_succeeded: successCount,
        tracks_failed: failCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (updateError) {
      throw new Error(`Failed to update job status: ${updateError.message}`);
    }

    logger.info(`Job ${jobId} completed with ${successCount}/${totalCount} successful analyses (${successRate.toFixed(1)}%)`);

    // You could add additional logic here, such as:
    // - Sending notifications to the user
    // - Triggering additional processing based on the results
    // - Generating reports or summaries
  } catch (error) {
    // Create standardized error info
    const errorInfo = createErrorInfo(error, { jobId });

    // Log the error
    logError(logger, errorInfo);

    // Update job status to 'failed'
    try {
      await supabase
        .from('analysis_jobs')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
    } catch (updateError) {
      logger.error(`Failed to update job status after error: ${updateError}`);
    }

    // Rethrow to let graphile-worker handle retries if configured
    throw error;
  }
}

// Export the task handler for Graphile Worker
module.exports = finishAnalysisJob;
