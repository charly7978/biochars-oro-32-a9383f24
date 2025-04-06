
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Camera Frame Processor
 * Captures and processes raw camera frames
 * First step in the unidirectional signal flow pipeline
 */

import { getSignalBus, createRawFrameSignal, SignalType, SignalPriority } from './SignalBus';

// Define ImageCapture interface if not available
declare global {
  interface Window {
    ImageCapture: typeof ImageCapture;
  }
  
  class ImageCapture {
    constructor(track: MediaStreamTrack);
    grabFrame(): Promise<ImageBitmap>;
    takePhoto(): Promise<Blob>;
  }
}

/**
 * Configuration for frame processing
 */
export interface FrameProcessingConfig {
  processingInterval?: number;  // Milliseconds between frame processing
  sampleRate?: number;          // Target frames per second
  regionOfInterest?: {          // Region to analyze (percentage values)
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Camera Frame Processor
 * Responsible for capturing camera frames and publishing them to the SignalBus
 */
export class CameraFrameProcessor {
  private isProcessing: boolean = false;
  private frameCounter: number = 0;
  private videoTrack: MediaStreamTrack | null = null;
  private imageCapture: ImageCapture | null = null;
  private tempCanvas: HTMLCanvasElement;
  private tempCtx: CanvasRenderingContext2D | null;
  private processorId: string;
  private signalBus = getSignalBus();
  private animationFrameId: number | null = null;
  private lastProcessTime: number = 0;
  
  // Configuration
  private config: Required<FrameProcessingConfig> = {
    processingInterval: 0,  // Process every frame by default
    sampleRate: 30,        // Target 30 fps
    regionOfInterest: {    // Default to center area
      x: 0.4,
      y: 0.4,
      width: 0.2,
      height: 0.2
    }
  };
  
  /**
   * Constructor
   */
  constructor(config?: FrameProcessingConfig) {
    // Create a processor ID
    this.processorId = `camera-processor-${Date.now().toString(36)}`;
    
    // Apply configuration
    if (config) {
      this.configure(config);
    }
    
    // Create temporary canvas for processing
    this.tempCanvas = document.createElement('canvas');
    this.tempCtx = this.tempCanvas.getContext('2d', { willReadFrequently: true });
    
    if (!this.tempCtx) {
      throw new Error('Failed to get 2D context for frame processing');
    }
    
    console.log(`CameraFrameProcessor: Initialized with ID ${this.processorId}`);
  }
  
  /**
   * Configure the processor
   */
  public configure(config: FrameProcessingConfig): void {
    this.config = {
      ...this.config,
      ...config
    };
    
    console.log('CameraFrameProcessor: Configuration updated', this.config);
  }
  
  /**
   * Set the video track for processing
   */
  public setVideoTrack(track: MediaStreamTrack): void {
    this.videoTrack = track;
    
    // Create ImageCapture API if supported
    if ('ImageCapture' in window) {
      try {
        this.imageCapture = new window.ImageCapture(track);
        console.log('CameraFrameProcessor: ImageCapture API initialized');
      } catch (error) {
        console.error('CameraFrameProcessor: Failed to initialize ImageCapture:', error);
        this.imageCapture = null;
      }
    } else {
      console.warn('CameraFrameProcessor: ImageCapture API not supported');
      this.imageCapture = null;
    }
  }
  
  /**
   * Start processing frames
   */
  public startProcessing(): void {
    if (this.isProcessing) {
      return;
    }
    
    this.isProcessing = true;
    this.frameCounter = 0;
    this.lastProcessTime = Date.now();
    
    console.log(`CameraFrameProcessor: Started processing (${this.processorId})`);
    
    // Start the frame processing loop
    this.processNextFrame();
  }
  
  /**
   * Stop processing frames
   */
  public stopProcessing(): void {
    if (!this.isProcessing) {
      return;
    }
    
    this.isProcessing = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    console.log(`CameraFrameProcessor: Stopped processing (${this.processorId})`);
  }
  
  /**
   * Process video frames from a video element
   */
  public processVideoElement(videoElement: HTMLVideoElement): void {
    if (!this.isProcessing || !videoElement) {
      return;
    }
    
    // Calculate the region of interest
    const roi = this.config.regionOfInterest;
    const x = Math.floor(videoElement.videoWidth * roi.x);
    const y = Math.floor(videoElement.videoHeight * roi.y);
    const width = Math.floor(videoElement.videoWidth * roi.width);
    const height = Math.floor(videoElement.videoHeight * roi.height);
    
    // Resize canvas to match video dimensions
    this.tempCanvas.width = width;
    this.tempCanvas.height = height;
    
    // Draw the region to the canvas
    this.tempCtx!.drawImage(
      videoElement, 
      x, y, width, height,
      0, 0, width, height
    );
    
    // Get image data
    const imageData = this.tempCtx!.getImageData(0, 0, width, height);
    
    // Create and publish raw frame signal
    const frameSignal = createRawFrameSignal(
      imageData,
      this.frameCounter++,
      this.processorId
    );
    
    this.signalBus.publish(frameSignal);
    
    // Schedule the next frame
    this.scheduleNextFrame();
  }
  
  /**
   * Process next frame using ImageCapture API if available
   */
  private processNextFrame(): void {
    if (!this.isProcessing) {
      return;
    }
    
    const now = Date.now();
    const elapsed = now - this.lastProcessTime;
    
    // Check if we need to wait based on the processing interval
    if (this.config.processingInterval > 0 && elapsed < this.config.processingInterval) {
      // Schedule next frame with remaining delay
      setTimeout(() => {
        this.animationFrameId = requestAnimationFrame(() => this.processNextFrame());
      }, this.config.processingInterval - elapsed);
      return;
    }
    
    this.lastProcessTime = now;
    
    // Use ImageCapture if available
    if (this.imageCapture) {
      this.imageCapture.grabFrame()
        .then(frame => {
          // Resize canvas to match image dimensions
          this.tempCanvas.width = frame.width;
          this.tempCanvas.height = frame.height;
          
          // Draw the frame to the canvas
          this.tempCtx!.drawImage(frame, 0, 0);
          
          // Get image data
          const imageData = this.tempCtx!.getImageData(0, 0, frame.width, frame.height);
          
          // Create and publish raw frame signal
          const frameSignal = createRawFrameSignal(
            imageData,
            this.frameCounter++,
            this.processorId
          );
          
          this.signalBus.publish(frameSignal);
        })
        .catch(err => {
          console.error('CameraFrameProcessor: Error grabbing frame:', err);
        })
        .finally(() => {
          // Schedule the next frame
          this.scheduleNextFrame();
        });
    } else if (this.videoTrack) {
      // Fallback for browsers without ImageCapture API
      console.warn('CameraFrameProcessor: Using fallback method for frame capture');
      this.scheduleNextFrame();
    } else {
      console.error('CameraFrameProcessor: No video track or ImageCapture available');
      this.stopProcessing();
    }
  }
  
  /**
   * Schedule the next frame processing
   */
  private scheduleNextFrame(): void {
    if (!this.isProcessing) {
      return;
    }
    
    this.animationFrameId = requestAnimationFrame(() => this.processNextFrame());
  }
  
  /**
   * Process a manually provided image data
   */
  public processImageData(imageData: ImageData): void {
    if (!this.isProcessing) {
      return;
    }
    
    // Create and publish raw frame signal
    const frameSignal = createRawFrameSignal(
      imageData,
      this.frameCounter++,
      this.processorId
    );
    
    this.signalBus.publish(frameSignal);
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.stopProcessing();
    this.frameCounter = 0;
  }
}

/**
 * Create a camera frame processor instance
 */
export function createCameraFrameProcessor(
  config?: FrameProcessingConfig
): CameraFrameProcessor {
  return new CameraFrameProcessor(config);
}
