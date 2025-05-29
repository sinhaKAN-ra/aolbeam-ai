/**
 * Model for storing corrected Mermaid diagrams
 */

/**
 * Interface for Mermaid correction data
 */
export interface MermaidCorrectionData {
  originalCode: string;
  correctedCode: string;
  errorMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Fallback implementation for environments where database is not available
 * This uses localStorage in the browser
 */
export class LocalMermaidCorrectionStore {
  private static instance: LocalMermaidCorrectionStore;
  private correctionMap: Map<string, MermaidCorrectionData> = new Map();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): LocalMermaidCorrectionStore {
    if (!LocalMermaidCorrectionStore.instance) {
      LocalMermaidCorrectionStore.instance = new LocalMermaidCorrectionStore();
    }
    return LocalMermaidCorrectionStore.instance;
  }

  /**
   * Save a corrected diagram
   */
  public saveCorrection(
    originalCode: string,
    correctedCode: string,
    errorMessage?: string
  ): MermaidCorrectionData {
    const correction: MermaidCorrectionData = {
      originalCode,
      correctedCode,
      errorMessage,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.correctionMap.set(originalCode, correction);
    this.saveToStorage();
    return correction;
  }

  /**
   * Get a corrected diagram
   */
  public getCorrection(originalCode: string): MermaidCorrectionData | null {
    return this.correctionMap.get(originalCode) || null;
  }

  /**
   * Save corrections to localStorage
   */
  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const serialized = JSON.stringify(Array.from(this.correctionMap.entries()));
        localStorage.setItem('mermaid-corrections-db', serialized);
      } catch (error) {
        console.error('Failed to save Mermaid corrections to storage:', error);
      }
    }
  }

  /**
   * Load corrections from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const serialized = localStorage.getItem('mermaid-corrections-db');
        if (serialized) {
          const entries = JSON.parse(serialized) as [string, MermaidCorrectionData][];
          this.correctionMap = new Map(entries);
        }
      } catch (error) {
        console.error('Failed to load Mermaid corrections from storage:', error);
      }
    }
  }
}
