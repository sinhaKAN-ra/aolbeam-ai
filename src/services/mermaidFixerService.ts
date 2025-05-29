/**
 * Service for fixing failed Mermaid diagrams using AI
 */

import { LocalMermaidCorrectionStore, MermaidCorrectionData } from '../models/MermaidCorrection';

interface MermaidFixRequest {
  originalCode: string;
  error?: string;
}

interface MermaidFixResponse {
  fixedCode: string;
  success: boolean;
}

/**
 * Sends a failed Mermaid diagram to an AI service for correction
 * @param originalCode The original Mermaid code that failed to render
 * @param error Optional error message from the original rendering attempt
 * @returns Promise with the fixed Mermaid code or null if fixing failed
 */
export async function fixMermaidDiagram(originalCode: string, error?: string): Promise<MermaidFixResponse> {
  try {
    // First check if we already have a correction for this diagram
    const correctionStore = LocalMermaidCorrectionStore.getInstance();
    const existingCorrection = correctionStore.getCorrection(originalCode);
    
    if (existingCorrection) {
      console.log('Using existing correction from database');
      return {
        fixedCode: existingCorrection.correctedCode,
        success: true
      };
    }
    
    // If no existing correction, call the AI service
    const response = await fetch('/api/fix-mermaid', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originalCode,
        error,
      } as MermaidFixRequest),
    });

    if (!response.ok) {
      throw new Error(`Failed to fix Mermaid diagram: ${response.statusText}`);
    }

    const result = await response.json() as MermaidFixResponse;
    
    // If successful, save the correction to the database
    if (result.success) {
      correctionStore.saveCorrection(originalCode, result.fixedCode, error);
    }
    
    return result;
  } catch (error) {
    console.error('Error fixing Mermaid diagram:', error);
    return {
      fixedCode: originalCode, // Return original code if fixing failed
      success: false
    };
  }
}

/**
 * Legacy storage for corrected Mermaid diagrams
 * This is kept for backward compatibility
 * New code should use LocalMermaidCorrectionStore from models/MermaidCorrection.ts
 */
export class MermaidCorrectionStore {
  private static instance: MermaidCorrectionStore;
  private correctionMap: Map<string, string> = new Map();
  private dbStore: LocalMermaidCorrectionStore;

  private constructor() {
    // Initialize the database store
    this.dbStore = LocalMermaidCorrectionStore.getInstance();
    // Try to load from localStorage if available
    this.loadFromStorage();
  }

  public static getInstance(): MermaidCorrectionStore {
    if (!MermaidCorrectionStore.instance) {
      MermaidCorrectionStore.instance = new MermaidCorrectionStore();
    }
    return MermaidCorrectionStore.instance;
  }

  /**
   * Get a corrected diagram if it exists
   * @param originalCode The original problematic code
   * @returns The corrected code or null if not found
   */
  public getCorrectedDiagram(originalCode: string): string | null {
    // First check the database store
    const dbCorrection = this.dbStore.getCorrection(originalCode);
    if (dbCorrection) {
      return dbCorrection.correctedCode;
    }
    
    // Fall back to the legacy map
    return this.correctionMap.get(originalCode) || null;
  }

  /**
   * Store a corrected diagram
   * @param originalCode The original problematic code
   * @param correctedCode The fixed code
   */
  public storeCorrectedDiagram(originalCode: string, correctedCode: string): void {
    // Store in both places for backward compatibility
    this.correctionMap.set(originalCode, correctedCode);
    this.dbStore.saveCorrection(originalCode, correctedCode);
    this.saveToStorage();
  }

  /**
   * Save corrections to localStorage
   */
  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const serialized = JSON.stringify(Array.from(this.correctionMap.entries()));
        localStorage.setItem('mermaid-corrections-legacy', serialized);
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
        // Try to load from both legacy and new storage
        const legacyData = localStorage.getItem('mermaid-corrections');
        const newData = localStorage.getItem('mermaid-corrections-legacy');
        
        if (legacyData) {
          const entries = JSON.parse(legacyData) as [string, string][];
          this.correctionMap = new Map(entries);
          
          // Migrate legacy data to the new format
          entries.forEach(([originalCode, correctedCode]) => {
            this.dbStore.saveCorrection(originalCode, correctedCode);
          });
          
          // Rename the legacy storage to avoid duplicate migrations
          localStorage.setItem('mermaid-corrections-legacy', legacyData);
          localStorage.removeItem('mermaid-corrections');
        } else if (newData) {
          const entries = JSON.parse(newData) as [string, string][];
          this.correctionMap = new Map(entries);
        }
      } catch (error) {
        console.error('Failed to load Mermaid corrections from storage:', error);
      }
    }
  }
}
