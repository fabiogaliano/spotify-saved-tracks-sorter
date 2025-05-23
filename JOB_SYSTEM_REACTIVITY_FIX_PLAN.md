# Job System Reactivity Fix - Unified Action Plan

## Objective
Fix job system reactivity issues where second run analysis freezes UI by eliminating stale closure problems and implementing proper WebSocket subscription management.

## Backend Job State Coordination

### [ ] Implement atomic job state clearing in LikedSongsContext
- Modify the analyzeTracks function to clear processedMessageIds immediately when setCurrentJob(null) is called
- Ensure job clearing happens before new job creation to prevent state contamination
- Add explicit cleanup of all job-related refs and state when transitioning between jobs

### [ ] Create centralized job subscription manager
- Extract WebSocket message handling logic into a dedicated subscription manager class
- Implement job-scoped message filtering that automatically invalidates when job changes
- Ensure subscription manager maintains current job reference without stale closures

### [ ] Fix job recovery race conditions
- Modify job recovery logic to complete before any new job creation attempts
- Ensure recovered job state is fully hydrated before WebSocket connections are established
- Prevent multiple simultaneous job recovery operations

## Frontend State Propagation

### [ ] Replace WebSocket useEffect with subscription pattern
- Convert WebSocket message handling from useEffect to direct subscription model
- Implement subscription cleanup that triggers immediately on job transitions
- Create subscription registry that maps job IDs to active WebSocket handlers

### [ ] Eliminate persistent state contamination in StatusCardWithJobStatus
- Remove persistentJob and persistentStats state that survives job transitions
- Make component fully dependent on props from parent context
- Ensure component state resets completely when currentJob becomes null

### [ ] Implement atomic job state updates
- Consolidate all job state mutations into single atomic operations
- Ensure trackStates Map updates happen simultaneously with dbStats updates
- Prevent partial state updates that cause UI inconsistencies

## WebSocket Connection Management

### [ ] Synchronize WebSocket lifecycle with job lifecycle
- Connect WebSocket only after job creation is complete and state is hydrated
- Disconnect WebSocket immediately when job transitions to null
- Implement connection recovery for jobs that were active during page reload

### [ ] Create job-scoped message routing
- Implement message routing that validates messages belong to current active job
- Add automatic message rejection for orphaned or stale job messages
- Ensure message processing order matches job state transition order

### [ ] Implement subscription-based track status updates
- Replace direct state mutations with subscription-based updates
- Create track-specific subscriptions that auto-cleanup on job completion
- Ensure track status updates are atomic and don't interfere with job statistics

## Integration Points

### [ ] Verify job persistence service integration
- Ensure JobPersistenceService correctly handles job state transitions
- Validate that database job status matches in-memory job state
- Confirm job recovery populates all required state for frontend reactivity

### [ ] Test complete job transition cycle
- Verify first job runs and completes successfully
- Verify second job starts with clean state and updates correctly
- Confirm UI shows accurate real-time progress for subsequent job runs