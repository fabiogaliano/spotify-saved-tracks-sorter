import { useEffect, useRef } from 'react';
import { jobSubscriptionManager, JobStatusUpdate } from '~/lib/services/JobSubscriptionManager';

/**
 * Custom hook to subscribe to job updates with stable subscription
 * Handles subscription lifecycle and ensures callbacks are always current
 */
export function useJobSubscription(
  onUpdate: (update: JobStatusUpdate) => void,
  enabled: boolean = true
) {
  // Store the latest callback in a ref to avoid re-subscribing
  const callbackRef = useRef(onUpdate);
  
  // Update the ref when callback changes
  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);
  
  // Set up stable subscription
  useEffect(() => {
    if (!enabled) return;
    
    // Create a stable wrapper that calls the current callback
    const stableCallback = (update: JobStatusUpdate) => {
      callbackRef.current(update);
    };
    
    // Subscribe with the stable callback
    const unsubscribe = jobSubscriptionManager.subscribe(stableCallback);
    
    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [enabled]); // Only re-subscribe if enabled changes
}