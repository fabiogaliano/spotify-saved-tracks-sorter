# Liked Songs Management Feature Implementation Plan

This document outlines the comprehensive implementation plan for the Liked Songs Management feature, including track analysis with background processing using graphile-worker.

## Architecture Overview

The Liked Songs Management feature provides users with the ability to view, analyze, and manage their liked songs. A key component is the ability to analyze tracks in the background using a job queue system (graphile-worker), which prevents timeout issues and provides a better user experience.

### Key Components

1. **Frontend Components**: UI elements for interacting with liked songs
2. **Background Processing**: Track analysis using graphile-worker
3. **Database Structure**: Tables for tracking jobs and analysis attempts
4. **Service Layer**: API calls and business logic

## Implementation Phases

### Phase 1: Infrastructure Setup

#### 1.1. Install Dependencies

- Add graphile-worker to the project
- Set up connection to Supabase PostgreSQL
- Configure environment variables for database access

#### 1.2. Worker Directory Structure

```
app/workers/
├── index.ts (worker process entry point)
├── tasks/
│   ├── analyzeTrack.ts (handler for individual track analysis)
│   └── finishAnalysisJob.ts (handler for completing a job)
└── utils/
    └── errorHandling.ts (error categorization and tracking)
```

#### 1.3. Database Schema

**analysis_jobs Table**

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key, auto-generated |
| user_id | integer | Foreign key to users table |
| status | string | 'pending', 'processing', 'completed', 'failed' |
| created_at | timestamp | When the job was created |
| updated_at | timestamp | Last status update time |
| track_count | integer | Total number of tracks in job |
| tracks_processed | integer | Number of tracks processed so far |
| tracks_succeeded | integer | Number of successful analyses |
| tracks_failed | integer | Number of failed analyses |

**track_analysis_attempts Table**

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key, auto-generated |
| job_id | integer | Foreign key to analysis_jobs table |
| track_id | integer | Foreign key to tracks table |
| status | string | 'pending', 'processing', 'succeeded', 'failed' |
| error_type | string (nullable) | Category of error if failed |
| error_message | string (nullable) | Detailed error message |
| created_at | timestamp | When the attempt was created |
| updated_at | timestamp | Last status update time |

### Phase 2: Backend Implementation

#### 2.1. Worker Process

**Worker Runner Setup**

- Create worker entry point that connects to Supabase PostgreSQL
- Configure concurrency, retry logic, and error handling
- Register task handlers for track analysis

**Task Handlers**

1. **analyzeTrack**: Process a single track
   - Retrieve track details from database
   - Create analysis service with user's provider key
   - Analyze track lyrics and metadata
   - Store results in track_analyses table
   - Update job and attempt status records
   - Handle errors with proper categorization

2. **finishAnalysisJob**: Finalize a job after all tracks are processed
   - Update job status to 'completed'
   - Generate summary statistics
   - Trigger notifications

#### 2.2. Server Routes

**Action Endpoints**

`app/routes/actions.analyze-liked-songs.tsx`
- Accepts track IDs to analyze
- Creates job record in analysis_jobs table
- Enqueues analysis tasks for each track
- Returns job ID to frontend for status tracking

**API Endpoints**

`app/routes/api.analysis-jobs.$jobId.tsx`
- Gets detailed status for a specific job
- Returns progress information, errors, and completion status

`app/routes/api.analysis-jobs.latest.tsx`
- Gets the user's most recent analysis job
- Useful for displaying status on page load

### Phase 3: Frontend Feature Implementation

#### 3.1. Feature Structure

```
app/features/liked-songs-management/
├── components/
│   ├── LikedSongsTable.tsx (table with track selection)
│   ├── AnalysisControls.tsx (analysis buttons)
│   ├── AnalysisJobStatus.tsx (progress indicator)
│   ├── AnalysisStatusBadge.tsx (status per track)
│   └── index.ts
├── context/
│   └── LikedSongsContext.tsx (state management)
├── hooks/
│   └── useAnalysisJob.ts (job status polling)
├── services/
│   └── analysisJobService.ts (API calls)
└── index.ts
```

#### 3.2. UI Components

**LikedSongsTable Component**
- Table for displaying and selecting liked songs
- Adapted from existing LikedSongsAnalysis component
- Row selection for batch analysis
- Status indicators for each track

**AnalysisControls Component**
- Buttons for triggering analysis
- Progress indicator for ongoing analysis
- Error summaries for failed analyses

**AnalysisJobStatus Component**
- Progress bar for overall job status
- Real-time updates on tracks processed
- Error count and summary

**AnalysisStatusBadge Component**
- Visual indicator of track analysis status
- Icons for different states (pending, processing, completed, failed)

#### 3.3. Context & Hooks

**LikedSongsContext**
- State management for liked songs and analysis
- Selected tracks tracking
- Analysis job status

**useAnalysisJob Hook**
- Job status polling with useEffect
- API calls to check job status
- Auto-refresh when analysis completes

#### 3.4. Services

**analysisJobService**
- Functions for interacting with job APIs
- Submit analysis job
- Check job status
- Get individual track analysis status

#### 3.5. Notification Integration

- Connect to NotificationStore for user feedback
- Add notifications for:
  - Job started
  - Job progress (every 10%)
  - Job completed
  - Job failed
  - Individual track failures (summarized)

### Phase 4: Testing & Deployment

#### 4.1. Testing Plan

**Worker Process Tests**
- Test job queueing and task execution
- Verify proper error handling and retries
- Test database interactions

**Frontend Integration Tests**
- Verify job status updates in UI
- Test UI responses to different job states
- Test auto-refresh on job completion

**End-to-End Tests**
- Start analysis job from UI
- Track status through the process
- Verify analysis results in database

#### 4.2. Deployment Considerations

**Worker Process Deployment**
- Set up worker process to run alongside main app
- Configure environment variables
- Add monitoring for worker health

**Database Migrations**
- Create necessary tables for job tracking
- Add indexes for performance

## Conclusion

This implementation plan provides a robust architecture for background processing of track analysis that will:
- Handle large batches of tracks without timeouts
- Track detailed error information for debugging
- Provide a responsive user experience
- Continue processing even if users navigate away

The job queue approach using graphile-worker ensures reliable processing while maintaining a good user experience and detailed error tracking for investigation.
