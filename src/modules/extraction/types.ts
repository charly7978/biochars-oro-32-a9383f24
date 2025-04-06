
/**
 * Processing priority levels for signal processing
 */
export type ProcessingPriority = 'low' | 'medium' | 'high';

/**
 * Frame extraction options
 */
export interface ExtractionOptions {
  /**
   * Maximum frames per second to process
   */
  maxFps?: number;
  
  /**
   * Whether to prioritize frames based on quality
   */
  usePrioritization?: boolean;
  
  /**
   * Minimum quality threshold for processing (0-100)
   */
  qualityThreshold?: number;
  
  /**
   * Default priority when quality can't be determined
   */
  defaultPriority?: ProcessingPriority;
}

/**
 * Result of frame extraction
 */
export interface ExtractionResult {
  /**
   * Extracted PPG value
   */
  value: number;
  
  /**
   * Timestamp of extraction
   */
  timestamp: number;
  
  /**
   * Quality of extraction (0-100)
   */
  quality: number;
  
  /**
   * Priority of this frame
   */
  priority: ProcessingPriority;
  
  /**
   * Region of interest in the source frame
   */
  roi?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Extraction performance metrics
 */
export interface ExtractionMetrics {
  /**
   * Average extraction time in milliseconds
   */
  avgExtractionTimeMs: number;
  
  /**
   * Frames processed per second
   */
  fps: number;
  
  /**
   * Percentage of frames that passed quality threshold
   */
  qualityPassRate: number;
  
  /**
   * Distribution of processing priorities
   */
  priorityDistribution: {
    low: number;
    medium: number;
    high: number;
  };
}
