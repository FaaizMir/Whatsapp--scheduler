/**
 * IndexedDB Manager for WhatsApp Scheduler Extension
 * 
 * Handles all local storage operations for:
 * - Tags (name, color, metadata)
 * - Scheduled messages (content, attachments, schedule time)
 * - Tag-group assignments (which groups belong to which tags)
 * 
 * All data is stored locally in the browser using IndexedDB.
 * No server communication - 100% client-side storage.
 * 
 * @milestone 1, 2, 3
 */

const DB_NAME = 'WhatsAppSchedulerDB';
const DB_VERSION = 1;

// Store names
export const STORE_NAMES = {
  TAGS: 'tags',
  SCHEDULED_MESSAGES: 'scheduledMessages',
  TAG_GROUP_ASSIGNMENTS: 'tagGroupAssignments',
};

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface ScheduledMessage {
  id: string;
  message: string;
  attachment?: {
    name: string;
    type: string;
    size: number;
    path: string; // File System Access API path
  };
  groupIds: string[];
  tagIds: string[];
  scheduledTime: number;
  createdTime: number;
  repeatOption: 'none' | 'daily' | 'weekly' | 'monthly';
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';
  sentToGroups?: string[];
  failedGroups?: string[];
}

export interface TagGroupAssignment {
  id: string;
  tagId: string;
  groupId: string;
  groupName: string;
  createdAt: number;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  /**
   * Initialize the database and create object stores
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create Tags store
        if (!db.objectStoreNames.contains(STORE_NAMES.TAGS)) {
          const tagStore = db.createObjectStore(STORE_NAMES.TAGS, { keyPath: 'id' });
          tagStore.createIndex('name', 'name', { unique: false });
          tagStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create Scheduled Messages store
        if (!db.objectStoreNames.contains(STORE_NAMES.SCHEDULED_MESSAGES)) {
          const messageStore = db.createObjectStore(STORE_NAMES.SCHEDULED_MESSAGES, { keyPath: 'id' });
          messageStore.createIndex('scheduledTime', 'scheduledTime', { unique: false });
          messageStore.createIndex('status', 'status', { unique: false });
          messageStore.createIndex('createdTime', 'createdTime', { unique: false });
        }

        // Create Tag-Group Assignments store
        if (!db.objectStoreNames.contains(STORE_NAMES.TAG_GROUP_ASSIGNMENTS)) {
          const assignmentStore = db.createObjectStore(STORE_NAMES.TAG_GROUP_ASSIGNMENTS, { keyPath: 'id' });
          assignmentStore.createIndex('tagId', 'tagId', { unique: false });
          assignmentStore.createIndex('groupId', 'groupId', { unique: false });
        }
      };
    });
  }

  /**
   * Generic method to add data to a store
   */
  async add<T>(storeName: string, data: T): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to add data to ${storeName}`));
    });
  }

  /**
   * Generic method to update data in a store
   */
  async update<T>(storeName: string, data: T): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to update data in ${storeName}`));
    });
  }

  /**
   * Generic method to get data by ID
   */
  async get<T>(storeName: string, id: string): Promise<T | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(`Failed to get data from ${storeName}`));
    });
  }

  /**
   * Generic method to get all data from a store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to get all data from ${storeName}`));
    });
  }

  /**
   * Generic method to delete data by ID
   */
  async delete(storeName: string, id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete data from ${storeName}`));
    });
  }

  /**
   * Get data by index
   */
  async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to get data by index from ${storeName}`));
    });
  }

  // ==================== TAG OPERATIONS ====================

  async createTag(tag: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tag> {
    const newTag: Tag = {
      ...tag,
      id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await this.add(STORE_NAMES.TAGS, newTag);
    return newTag;
  }

  async updateTag(id: string, updates: Partial<Tag>): Promise<void> {
    const existingTag = await this.get<Tag>(STORE_NAMES.TAGS, id);
    if (!existingTag) throw new Error('Tag not found');
    
    const updatedTag = {
      ...existingTag,
      ...updates,
      updatedAt: Date.now(),
    };
    await this.update(STORE_NAMES.TAGS, updatedTag);
  }

  async deleteTag(id: string): Promise<void> {
    // Delete all assignments for this tag
    const assignments = await this.getByIndex<TagGroupAssignment>(
      STORE_NAMES.TAG_GROUP_ASSIGNMENTS,
      'tagId',
      id
    );
    for (const assignment of assignments) {
      await this.delete(STORE_NAMES.TAG_GROUP_ASSIGNMENTS, assignment.id);
    }
    
    // Delete the tag
    await this.delete(STORE_NAMES.TAGS, id);
  }

  async getAllTags(): Promise<Tag[]> {
    return this.getAll<Tag>(STORE_NAMES.TAGS);
  }

  // ==================== TAG-GROUP ASSIGNMENT OPERATIONS ====================

  async assignGroupToTag(tagId: string, groupId: string, groupName: string): Promise<void> {
    // Check if already assigned
    const existing = await this.getByIndex<TagGroupAssignment>(
      STORE_NAMES.TAG_GROUP_ASSIGNMENTS,
      'tagId',
      tagId
    );
    
    if (existing.some(a => a.groupId === groupId)) {
      return; // Already assigned
    }

    const assignment: TagGroupAssignment = {
      id: `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tagId,
      groupId,
      groupName,
      createdAt: Date.now(),
    };
    
    await this.add(STORE_NAMES.TAG_GROUP_ASSIGNMENTS, assignment);
  }

  async unassignGroupFromTag(tagId: string, groupId: string): Promise<void> {
    const assignments = await this.getByIndex<TagGroupAssignment>(
      STORE_NAMES.TAG_GROUP_ASSIGNMENTS,
      'tagId',
      tagId
    );
    
    const assignment = assignments.find(a => a.groupId === groupId);
    if (assignment) {
      await this.delete(STORE_NAMES.TAG_GROUP_ASSIGNMENTS, assignment.id);
    }
  }

  async getGroupsForTag(tagId: string): Promise<TagGroupAssignment[]> {
    return this.getByIndex<TagGroupAssignment>(
      STORE_NAMES.TAG_GROUP_ASSIGNMENTS,
      'tagId',
      tagId
    );
  }

  async getTagsForGroup(groupId: string): Promise<TagGroupAssignment[]> {
    return this.getByIndex<TagGroupAssignment>(
      STORE_NAMES.TAG_GROUP_ASSIGNMENTS,
      'groupId',
      groupId
    );
  }

  // ==================== SCHEDULED MESSAGE OPERATIONS ====================

  async createScheduledMessage(
    message: Omit<ScheduledMessage, 'id' | 'createdTime' | 'status'>
  ): Promise<ScheduledMessage> {
    const newMessage: ScheduledMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdTime: Date.now(),
      status: 'pending',
    };
    await this.add(STORE_NAMES.SCHEDULED_MESSAGES, newMessage);
    return newMessage;
  }

  async updateScheduledMessage(id: string, updates: Partial<ScheduledMessage>): Promise<void> {
    const existingMessage = await this.get<ScheduledMessage>(STORE_NAMES.SCHEDULED_MESSAGES, id);
    if (!existingMessage) throw new Error('Scheduled message not found');
    
    const updatedMessage = {
      ...existingMessage,
      ...updates,
    };
    await this.update(STORE_NAMES.SCHEDULED_MESSAGES, updatedMessage);
  }

  async deleteScheduledMessage(id: string): Promise<void> {
    await this.delete(STORE_NAMES.SCHEDULED_MESSAGES, id);
  }

  async getAllScheduledMessages(): Promise<ScheduledMessage[]> {
    return this.getAll<ScheduledMessage>(STORE_NAMES.SCHEDULED_MESSAGES);
  }

  async getScheduledMessagesByStatus(status: ScheduledMessage['status']): Promise<ScheduledMessage[]> {
    return this.getByIndex<ScheduledMessage>(STORE_NAMES.SCHEDULED_MESSAGES, 'status', status);
  }
}

// Export singleton instance
const dbManager = new IndexedDBManager();
export default dbManager;
