/**
 * In-memory vector cache to simulate database storage
 * This avoids repeated API calls for the same content
 */

interface CacheEntry {
  embedding: number[];
  timestamp: number;
  contentHash: string;
}

class VectorCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 1000 * 60 * 60; // 1 hour cache

  /**
   * Generate a cache key from content
   */
  private generateKey(type: 'playlist' | 'track', contentId: string, contentHash: string): string {
    return `${type}:${contentId}:${contentHash}`;
  }

  /**
   * Create a hash of the analysis content to detect changes
   */
  private hashContent(content: any): string {
    return JSON.stringify(content).split('').reduce((hash, char) => {
      const charCode = char.charCodeAt(0);
      return ((hash << 5) - hash) + charCode;
    }, 0).toString();
  }

  /**
   * Get cached embedding for playlist
   */
  getPlaylistEmbedding(playlistId: string, analysis: any): number[] | null {
    const contentHash = this.hashContent(analysis);
    const key = this.generateKey('playlist', playlistId, contentHash);
    const entry = this.cache.get(key);

    if (entry && (Date.now() - entry.timestamp) < this.TTL_MS) {
      console.log(`[VectorCache] HIT: Playlist ${playlistId}`);
      return entry.embedding;
    }

    console.log(`[VectorCache] MISS: Playlist ${playlistId}`);
    return null;
  }

  /**
   * Cache playlist embedding
   */
  setPlaylistEmbedding(playlistId: string, analysis: any, embedding: number[]): void {
    const contentHash = this.hashContent(analysis);
    const key = this.generateKey('playlist', playlistId, contentHash);
    
    this.cache.set(key, {
      embedding,
      timestamp: Date.now(),
      contentHash
    });
    
    console.log(`[VectorCache] CACHED: Playlist ${playlistId} (${embedding.length}D vector)`);
  }

  /**
   * Get cached embedding for track
   */
  getTrackEmbedding(trackId: string, analysis: any): number[] | null {
    const contentHash = this.hashContent(analysis);
    const key = this.generateKey('track', trackId, contentHash);
    const entry = this.cache.get(key);

    if (entry && (Date.now() - entry.timestamp) < this.TTL_MS) {
      console.log(`[VectorCache] HIT: Track ${trackId}`);
      return entry.embedding;
    }

    console.log(`[VectorCache] MISS: Track ${trackId}`);
    return null;
  }

  /**
   * Cache track embedding
   */
  setTrackEmbedding(trackId: string, analysis: any, embedding: number[]): void {
    const contentHash = this.hashContent(analysis);
    const key = this.generateKey('track', trackId, contentHash);
    
    this.cache.set(key, {
      embedding,
      timestamp: Date.now(),
      contentHash
    });
    
    console.log(`[VectorCache] CACHED: Track ${trackId} (${embedding.length}D vector)`);
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; hitRate: number; memoryUsage: string } {
    const entries = Array.from(this.cache.values());
    const totalVectors = entries.length;
    const avgVectorSize = entries.length > 0 
      ? entries.reduce((sum, entry) => sum + entry.embedding.length, 0) / entries.length 
      : 0;
    
    // Rough memory estimation: each number is ~8 bytes + overhead
    const memoryBytes = totalVectors * avgVectorSize * 8;
    const memoryMB = (memoryBytes / (1024 * 1024)).toFixed(2);

    return {
      size: totalVectors,
      hitRate: 0, // Would need to track hits/misses for real calculation
      memoryUsage: `${memoryMB} MB`
    };
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) >= this.TTL_MS) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`[VectorCache] Cleaned up ${removed} expired entries`);
    }
  }

  /**
   * Clear all cached vectors
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[VectorCache] Cleared ${size} cached vectors`);
  }
}

// Global singleton instance
export const vectorCache = new VectorCache();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  vectorCache.cleanup();
}, 10 * 60 * 1000);