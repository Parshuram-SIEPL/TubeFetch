import { type VideoMetadata } from "@shared/schema";

export interface IStorage {
  // For this app, we don't need persistent storage
  // All data comes from YouTube API
}

export class MemStorage implements IStorage {
  constructor() {
    // No storage needed for this application
  }
}

export const storage = new MemStorage();
