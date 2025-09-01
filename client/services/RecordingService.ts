// RecordingService.ts - Comprehensive recording management with error handling and backup strategies

interface RecordingConfig {
  mimeType: string;
  audioBitsPerSecond: number;
  chunkDuration: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
}

interface ChunkData {
  id: string;
  index: number;
  blob: Blob;
  hash: string;
  uploadAttempts: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  lastError?: string;
}

interface RecordingSession {
  id: string;
  startTime: number;
  chunks: Map<number, ChunkData>;
  mediaRecorder: MediaRecorder | null;
  stream: MediaStream | null;
  isActive: boolean;
  backupEnabled: boolean;
  isStopping: boolean;
  finalChunkReceived: boolean;
  audioContext?: AudioContext;
  mixedStream?: MediaStream;
  destination?: MediaStreamAudioDestinationNode;
}

class RecordingService {
  private static instance: RecordingService;
  private config: RecordingConfig;
  private activeSession: RecordingSession | null = null;
  private indexedDBName = 'VouchRecordings';
  private indexedDBVersion = 1;
  private db: IDBDatabase | null = null;

  private constructor() {
    this.config = {
      mimeType: this.getBestMimeType(),
      audioBitsPerSecond: 128000,
      chunkDuration: 30000, // 30 seconds
      maxRetries: 5,
      retryDelay: 1000, // Start with 1 second
    };
    this.initIndexedDB();
  }

  public static getInstance(): RecordingService {
    if (!RecordingService.instance) {
      RecordingService.instance = new RecordingService();
    }
    return RecordingService.instance;
  }

  // IndexedDB initialization for local backup
  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.indexedDBName, this.indexedDBVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized for recording backup');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store for recording chunks
        if (!db.objectStoreNames.contains('chunks')) {
          const chunkStore = db.createObjectStore('chunks', { keyPath: 'id' });
          chunkStore.createIndex('recordingId', 'recordingId', { unique: false });
          chunkStore.createIndex('chunkIndex', 'chunkIndex', { unique: false });
        }

        // Create object store for recording metadata
        if (!db.objectStoreNames.contains('recordings')) {
          const recordingStore = db.createObjectStore('recordings', { keyPath: 'id' });
          recordingStore.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }

  // Determine the best supported MIME type for recording
  private getBestMimeType(): string {
    const preferredTypes = [
      'audio/webm;codecs=opus',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/wav',
      'audio/webm',
      'audio/ogg;codecs=opus'
    ];

    for (const mimeType of preferredTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        console.log(`🎤 Selected MIME type: ${mimeType}`);
        return mimeType;
      }
    }

    console.warn('⚠️ No preferred MIME type supported, using default');
    return 'audio/webm';
  }

  // Calculate SHA-256 hash of a blob
  private async calculateHash(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Save chunk to IndexedDB as backup
  private async saveChunkToIndexedDB(recordingId: string, chunkData: ChunkData): Promise<void> {
    if (!this.db) {
      console.warn('⚠️ IndexedDB not available for backup');
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chunks'], 'readwrite');
      const store = transaction.objectStore('chunks');

      const chunkRecord = {
        id: `${recordingId}_chunk_${chunkData.index}`,
        recordingId: recordingId,
        chunkIndex: chunkData.index,
        blob: chunkData.blob,
        hash: chunkData.hash,
        createdAt: new Date().toISOString(),
        uploadStatus: chunkData.status
      };

      const request = store.put(chunkRecord);
      
      request.onsuccess = () => {
        console.log(`💾 Chunk ${chunkData.index} backed up to IndexedDB`);
        resolve();
      };
      
      request.onerror = () => {
        console.error(`❌ Failed to backup chunk ${chunkData.index} to IndexedDB:`, request.error);
        reject(request.error);
      };
    });
  }

  // Upload chunk with retry logic and exponential backoff
  private async uploadChunkWithRetry(recordingId: string, chunkData: ChunkData, password: string): Promise<boolean> {
    let attempt = 0;
    let delay = this.config.retryDelay;

    while (attempt < this.config.maxRetries) {
      try {
        chunkData.uploadAttempts = attempt + 1;
        chunkData.status = 'uploading';

        console.log(`📤 Uploading chunk ${chunkData.index} (attempt ${attempt + 1}/${this.config.maxRetries})`);

        const formData = new FormData();
        formData.append('chunk', chunkData.blob);
        formData.append('recording_id', recordingId);
        formData.append('chunk_index', chunkData.index.toString());
        formData.append('password', password);

        const response = await fetch('/api/admin/recordings/chunk', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success) {
          chunkData.status = 'uploaded';
          console.log(`✅ Chunk ${chunkData.index} uploaded successfully`);
          return true;
        } else {
          throw new Error(result.error || 'Upload failed');
        }

      } catch (error) {
        attempt++;
        chunkData.lastError = error.message;
        
        console.error(`❌ Chunk ${chunkData.index} upload attempt ${attempt} failed:`, error.message);

        if (attempt >= this.config.maxRetries) {
          chunkData.status = 'failed';
          console.error(`💥 Chunk ${chunkData.index} upload failed after ${this.config.maxRetries} attempts`);
          return false;
        }

        // Exponential backoff with jitter
        const jitter = Math.random() * 1000; // 0-1000ms jitter
        const waitTime = delay + jitter;
        
        console.log(`⏳ Retrying chunk ${chunkData.index} in ${Math.round(waitTime)}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        delay *= 2; // Exponential backoff
      }
    }

    return false;
  }

  // Start a new recording session with mixed audio
  public async startRecording(password: string, remoteAudioElement?: HTMLAudioElement, voucherName?: string, voucheeName?: string, callCode?: string): Promise<string> {
    try {
      if (this.activeSession?.isActive) {
        throw new Error('Recording session already active');
      }

      console.log('🎙️ Starting new recording session with mixed audio...');
      console.log('📋 Recording session parameters:', {
        password: password ? '[PROVIDED]' : '[MISSING]',
        voucherName,
        voucheeName,
        callCode,
        hasRemoteAudio: !!remoteAudioElement
      });

      // Get microphone access with high-quality settings
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 2,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio context for mixing
      const audioContext = new AudioContext({ sampleRate: 44100 });

      // Create destination for mixed audio
      const destination = audioContext.createMediaStreamDestination();

      // Connect microphone to mixer
      const micSource = audioContext.createMediaStreamSource(micStream);
      const micGain = audioContext.createGain();
      micGain.gain.value = 0.8; // Slightly reduce mic volume to prevent overwhelming AI audio
      micSource.connect(micGain);
      micGain.connect(destination);

      console.log('🎤 Microphone connected to mixer');

      // If we have AI audio, connect it to the mixer too
      if (remoteAudioElement && remoteAudioElement.srcObject) {
        try {
          const remoteStream = remoteAudioElement.srcObject as MediaStream;
          const remoteSource = audioContext.createMediaStreamSource(remoteStream);
          const remoteGain = audioContext.createGain();
          remoteGain.gain.value = 1.0; // Full volume for AI responses
          remoteSource.connect(remoteGain);
          remoteGain.connect(destination);
          console.log('🤖 AI audio connected to mixer');
        } catch (remoteError) {
          console.warn('⚠️ Could not connect AI audio to mixer:', remoteError);
          console.log('📝 Recording will continue with microphone only');
        }
      } else {
        console.warn('⚠️ No AI audio source provided, recording microphone only');
      }

      // Use the mixed stream for recording
      const stream = destination.stream;

      // Create recording session on server
      const requestData = {
        action: 'start_recording',
        call_code: callCode || `REC-${Date.now()}`,
        mime_type: this.config.mimeType,
        password: password,
        voucher_name: voucherName,
        vouchee_name: voucheeName,
      };

      console.log('📤 Sending recording session creation request:', requestData);

      const sessionResponse = await fetch('/api/admin/recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text();
        console.error('❌ Failed to create recording session:', {
          status: sessionResponse.status,
          statusText: sessionResponse.statusText,
          error: errorText
        });
        throw new Error(`Failed to create recording session on server: ${sessionResponse.status} ${errorText}`);
      }

      const sessionData = await sessionResponse.json();
      console.log('✅ Recording session creation response:', sessionData);

      const { recording_id } = sessionData;

      // Initialize MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.config.mimeType,
        audioBitsPerSecond: this.config.audioBitsPerSecond,
      });

      // Create session object
      this.activeSession = {
        id: recording_id,
        startTime: Date.now(),
        chunks: new Map(),
        mediaRecorder,
        stream,
        isActive: true,
        backupEnabled: true,
        isStopping: false,
        finalChunkReceived: false,
        audioContext,
        mixedStream: stream,
        destination,
      };

      // Set up event handlers
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          await this.handleChunkAvailable(event.data, password);
        }

        // If we're stopping and this is likely the final chunk, mark it
        if (this.activeSession?.isStopping && mediaRecorder.state === 'inactive') {
          this.activeSession.finalChunkReceived = true;
          console.log('📝 Final chunk received and processed');
        }
      };

      mediaRecorder.onstop = async () => {
        await this.handleRecordingStop(password);
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        this.handleRecordingError(new Error('MediaRecorder error'));
      };

      // Start recording with chunked intervals
      mediaRecorder.start(this.config.chunkDuration);

      console.log(`�� Recording session ${recording_id} started successfully`);
      return recording_id;

    } catch (error) {
      console.error('💥 Failed to start recording:', error);
      throw error;
    }
  }

  // Connect AI audio to an existing recording session
  public connectAIAudioToRecording(remoteAudioElement: HTMLAudioElement): boolean {
    if (!this.activeSession?.isActive || !this.activeSession.audioContext || !this.activeSession.destination) {
      console.warn('⚠️ No active recording session to connect AI audio to');
      return false;
    }

    try {
      if (remoteAudioElement.srcObject) {
        const remoteStream = remoteAudioElement.srcObject as MediaStream;
        const remoteSource = this.activeSession.audioContext.createMediaStreamSource(remoteStream);
        const remoteGain = this.activeSession.audioContext.createGain();
        remoteGain.gain.value = 1.0; // Full volume for AI responses

        // Connect to the MediaStreamDestination used for recording
        remoteSource.connect(remoteGain);
        remoteGain.connect(this.activeSession.destination);

        console.log('🤖 AI audio connected to existing recording session');
        return true;
      }
    } catch (error) {
      console.warn('⚠️ Failed to connect AI audio to recording:', error);
    }

    return false;
  }

  // Handle new chunk availability
  private async handleChunkAvailable(blob: Blob, password: string): Promise<void> {
    if (!this.activeSession) return;

    try {
      const chunkIndex = this.activeSession.chunks.size;
      const hash = await this.calculateHash(blob);

      console.log(`📦 Processing chunk ${chunkIndex} (${blob.size} bytes, stopping: ${this.activeSession.isStopping})`);

      const chunkData: ChunkData = {
        id: `${this.activeSession.id}_${chunkIndex}`,
        index: chunkIndex,
        blob: blob,
        hash: hash,
        uploadAttempts: 0,
        status: 'pending',
      };

      this.activeSession.chunks.set(chunkIndex, chunkData);

      console.log(`📊 Chunk ${chunkIndex} queued (${blob.size} bytes, hash: ${hash.substring(0, 8)}...)`);

      // Save to IndexedDB as backup (async, don't wait)
      if (this.activeSession.backupEnabled) {
        this.saveChunkToIndexedDB(this.activeSession.id, chunkData).catch(error => {
          console.warn('⚠️ Failed to backup chunk to IndexedDB:', error);
        });
      }

      // Upload immediately (async, don't block recording)
      this.uploadChunkWithRetry(this.activeSession.id, chunkData, password).catch(error => {
        console.error(`💥 Failed to upload chunk ${chunkIndex}:`, error);
      });

      // If this chunk has a very small size and we're stopping, it might be the final chunk
      if (this.activeSession.isStopping && blob.size < 1024) {
        console.log(`📝 Small chunk detected during stop (${blob.size} bytes) - likely final chunk`);
      }

    } catch (error) {
      console.error('❌ Error handling chunk:', error);
    }
  }

  // Stop the current recording session
  public async stopRecording(): Promise<void> {
    if (!this.activeSession?.isActive) {
      throw new Error('No active recording session');
    }

    console.log('🛑 Stopping recording session...');

    this.activeSession.isActive = false;
    this.activeSession.isStopping = true;

    if (this.activeSession.mediaRecorder && this.activeSession.mediaRecorder.state === 'recording') {
      this.activeSession.mediaRecorder.stop();
    }

    if (this.activeSession.stream) {
      this.activeSession.stream.getTracks().forEach(track => track.stop());
    }

    // Clean up audio context
    if (this.activeSession.audioContext) {
      try {
        await this.activeSession.audioContext.close();
        console.log('🔇 Audio context closed');
      } catch (error) {
        console.warn('⚠️ Error closing audio context:', error);
      }
    }
  }

  // Handle recording stop event
  private async handleRecordingStop(password: string): Promise<void> {
    if (!this.activeSession) return;

    try {
      console.log('🏁 Processing recording completion...');

      // Wait a moment for any final chunk to be processed
      if (this.activeSession.isStopping && !this.activeSession.finalChunkReceived) {
        console.log('⏳ Waiting for final chunk to be processed...');
        let waitTime = 0;
        const maxWait = 5000; // 5 seconds max wait

        while (!this.activeSession.finalChunkReceived && waitTime < maxWait) {
          await new Promise(resolve => setTimeout(resolve, 100));
          waitTime += 100;
        }

        if (waitTime >= maxWait) {
          console.warn('⚠️ Timeout waiting for final chunk, proceeding anyway');
        }
      }

      const totalDuration = Math.round((Date.now() - this.activeSession.startTime) / 1000);
      const totalChunks = this.activeSession.chunks.size;

      console.log(`📊 Recording summary: ${totalChunks} chunks, ${totalDuration}s duration`);

      // Wait for all pending uploads to complete or fail
      await this.waitForUploadsToComplete();

      // Finalize recording on server
      const finalizeResponse = await fetch('/api/admin/recordings/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recording_id: this.activeSession.id,
          total_chunks: totalChunks,
          total_duration: totalDuration,
          password: password,
        }),
      });

      if (!finalizeResponse.ok) {
        throw new Error('Failed to finalize recording on server');
      }

      const result = await finalizeResponse.json();
      
      if (result.success) {
        console.log(`✅ Recording ${this.activeSession.id} completed successfully`);
      } else {
        console.warn(`⚠️ Recording completed with issues:`, result.verification_results);
      }

      // Clean up session
      this.activeSession = null;

    } catch (error) {
      console.error('💥 Error during recording completion:', error);
      this.handleRecordingError(error);
    }
  }

  // Wait for all uploads to complete or fail
  private async waitForUploadsToComplete(timeout: number = 60000): Promise<void> {
    if (!this.activeSession) return;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const pendingChunks = Array.from(this.activeSession.chunks.values())
        .filter(chunk => chunk.status === 'pending' || chunk.status === 'uploading');

      if (pendingChunks.length === 0) {
        console.log('✅ All chunks processed');
        return;
      }

      console.log(`⏳ Waiting for ${pendingChunks.length} chunks to complete...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.warn('⚠️ Upload completion timeout reached');
  }

  // Handle recording errors
  private handleRecordingError(error: Error): void {
    console.error('💥 Recording error:', error);

    if (this.activeSession) {
      this.activeSession.isActive = false;
      
      // Stop media recorder and stream
      if (this.activeSession.mediaRecorder) {
        try {
          this.activeSession.mediaRecorder.stop();
        } catch (e) {
          console.warn('Warning stopping MediaRecorder:', e);
        }
      }

      if (this.activeSession.stream) {
        this.activeSession.stream.getTracks().forEach(track => track.stop());
      }
    }

    // Could emit error event here for UI handling
  }

  // Retry failed uploads from IndexedDB backup
  public async retryFailedUploads(recordingId: string, password: string): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not available for recovery');
    }

    console.log(`🔄 Attempting to retry failed uploads for recording ${recordingId}`);

    // Get chunks from IndexedDB
    const chunks = await this.getChunksFromIndexedDB(recordingId);
    
    for (const chunkRecord of chunks) {
      if (chunkRecord.uploadStatus !== 'uploaded') {
        const chunkData: ChunkData = {
          id: chunkRecord.id,
          index: chunkRecord.chunkIndex,
          blob: chunkRecord.blob,
          hash: chunkRecord.hash,
          uploadAttempts: 0,
          status: 'pending',
        };

        const success = await this.uploadChunkWithRetry(recordingId, chunkData, password);
        if (success) {
          // Update IndexedDB record
          await this.updateChunkInIndexedDB(chunkRecord.id, 'uploaded');
        }
      }
    }
  }

  // Get chunks from IndexedDB
  private async getChunksFromIndexedDB(recordingId: string): Promise<any[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chunks'], 'readonly');
      const store = transaction.objectStore('chunks');
      const index = store.index('recordingId');
      const request = index.getAll(recordingId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Update chunk status in IndexedDB
  private async updateChunkInIndexedDB(chunkId: string, status: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chunks'], 'readwrite');
      const store = transaction.objectStore('chunks');
      const getRequest = store.get(chunkId);

      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          record.uploadStatus = status;
          record.updatedAt = new Date().toISOString();
          
          const putRequest = store.put(record);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(); // Record not found, that's okay
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Get current session status
  public getSessionStatus(): {
    isActive: boolean;
    recordingId?: string;
    duration?: number;
    chunksTotal?: number;
    chunksUploaded?: number;
    chunksFailed?: number;
  } | null {
    if (!this.activeSession) return null;

    const chunks = Array.from(this.activeSession.chunks.values());
    const duration = Math.round((Date.now() - this.activeSession.startTime) / 1000);

    return {
      isActive: this.activeSession.isActive,
      recordingId: this.activeSession.id,
      duration,
      chunksTotal: chunks.length,
      chunksUploaded: chunks.filter(c => c.status === 'uploaded').length,
      chunksFailed: chunks.filter(c => c.status === 'failed').length,
    };
  }

  // Clean up old IndexedDB records
  public async cleanupOldBackups(daysOld: number = 7): Promise<void> {
    if (!this.db) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chunks'], 'readwrite');
      const store = transaction.objectStore('chunks');
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const record = cursor.value;
          const createdAt = new Date(record.createdAt);
          
          if (createdAt < cutoffDate && record.uploadStatus === 'uploaded') {
            cursor.delete();
            console.log(`🗑️ Cleaned up old backup chunk: ${record.id}`);
          }
          
          cursor.continue();
        } else {
          console.log('✅ Backup cleanup completed');
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }
}

export default RecordingService;
export type { RecordingConfig, ChunkData, RecordingSession };
