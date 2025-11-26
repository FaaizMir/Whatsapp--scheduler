import * as React from 'react';
import dbManager, { Tag, TagGroupAssignment } from '../../utils/IndexedDBManager';
import { ChromeMessageTypes } from '../../types/ChromeMessageTypes';
import { WhatsAppGroup } from '../../types/ChromeMessageContentTypes';

const TAG_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', 
  '#8B5CF6', '#EC4899', '#F43F5E', '#14B8A6', '#06B6D4'
];

interface CreateTagsState {
  tags: Tag[];
  groups: WhatsAppGroup[];
  assignments: TagGroupAssignment[];
  isLoading: boolean;
  isLoadingGroups: boolean;
  groupsLoadError: string | null;
  showCreateModal: boolean;
  showDeleteConfirm: boolean;
  tagToDelete: string | null;
  editingTag: Tag | null;
  newTagName: string;
  newTagColor: string;
  selectedTagId: string | null;
  selectedGroupIds: Set<string>; // Pending selections (not yet saved)
  savedGroupIds: Set<string>; // Actually saved in DB
  searchQuery: string;
  hasUnsavedChanges: boolean;
}

/**
 * CreateTags Component
 * Handles all tag-related operations and group assignments
 */
class CreateTags extends React.Component<{}, CreateTagsState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      tags: [],
      groups: [],
      assignments: [],
      isLoading: true,
      isLoadingGroups: false,
      groupsLoadError: null,
      showCreateModal: false,
      showDeleteConfirm: false,
      tagToDelete: null,
      editingTag: null,
      newTagName: '',
      newTagColor: TAG_COLORS[0],
      selectedTagId: null,
      selectedGroupIds: new Set(),
      savedGroupIds: new Set(),
      searchQuery: '',
      hasUnsavedChanges: false,
    };
  }

  async componentDidMount() {
    await dbManager.init();
    await this.loadTags();
    await this.loadGroups();
    await this.loadAssignments();
    this.setState({ isLoading: false });
  }

  /**
   * Load all tags from IndexedDB
   */
  loadTags = async () => {
    const tags = await dbManager.getAllTags();
    this.setState({ tags });
  };

  /**
   * Fetch WhatsApp groups from the page context via window messaging
   * Uses WPPConnect API injected in wa-js.ts
   */
  loadGroups = async (showLoading: boolean = false) => {
    if (showLoading) {
      this.setState({ isLoadingGroups: true, groupsLoadError: null });
    }
    
    try {
      // Request groups from the webpage via window messaging
      const groups = await this.requestGroupsFromPage();
      if (groups && groups.length > 0) {
        this.setState({ 
          groups: groups, 
          isLoadingGroups: false, 
          groupsLoadError: null 
        });
        console.log('[CreateTags] Successfully loaded', groups.length, 'groups');
      } else {
        const errorMsg = 'No groups found. Make sure you are logged into WhatsApp Web and have groups.';
        console.warn('[CreateTags]', errorMsg);
        this.setState({ 
          groups: [], 
          isLoadingGroups: false, 
          groupsLoadError: errorMsg
        });
      }
    } catch (error) {
      console.error('[CreateTags] Failed to load WhatsApp groups:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load groups. Please try again.';
      this.setState({ 
        groups: [], 
        isLoadingGroups: false, 
        groupsLoadError: errorMessage
      });
    }
  };

  /**
   * Request WhatsApp groups from page context
   * Sends message to wa-js.ts which has access to WPP API
   */
  requestGroupsFromPage = (): Promise<WhatsAppGroup[]> => {
    return new Promise((resolve, reject) => {
      const messageId = `get_groups_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('[CreateTags] Requesting groups with ID:', messageId);
      
      const responseHandler = (event: MessageEvent) => {
        // Only handle messages from the same window
        if (event.source !== window) return;
        
        if (event.data.type === 'GET_GROUPS_RESPONSE' && event.data.id === messageId) {
          console.log('[CreateTags] Received groups response:', event.data);
          window.removeEventListener('message', responseHandler);
          clearTimeout(timeoutId);
          
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.groups || []);
          }
        }
      };

      window.addEventListener('message', responseHandler);
      
      // Send message to page context (main world)
      console.log('[CreateTags] Sending GET_GROUPS_REQUEST to main world');
      window.postMessage({ type: 'GET_GROUPS_REQUEST', id: messageId }, '*');

      // Also try sending via document (for cross-context communication)
      if (document) {
        document.dispatchEvent(new CustomEvent('GET_GROUPS_REQUEST', {
          detail: { type: 'GET_GROUPS_REQUEST', id: messageId }
        }));
      }

      // Timeout after 15 seconds
      const timeoutId = setTimeout(() => {
        window.removeEventListener('message', responseHandler);
        console.error('[CreateTags] Timeout waiting for groups response');
        reject(new Error('Timeout: Groups did not load in time. Make sure WhatsApp Web is fully loaded and you are logged in.'));
      }, 15000);
    });
  };

  /**
   * Load all tag-group assignments from IndexedDB
   */
  loadAssignments = async () => {
    const assignments = await dbManager.getAll<TagGroupAssignment>('tagGroupAssignments');
    this.setState({ assignments });
  };

  /**
   * Create a new tag and save to IndexedDB
   */
  handleCreateTag = async () => {
    const { newTagName, newTagColor } = this.state;
    if (!newTagName.trim()) return;

    const tag = await dbManager.createTag({
      name: newTagName.trim(),
      color: newTagColor,
    });

    await this.loadTags();
    this.setState({
      showCreateModal: false,
      newTagName: '',
      newTagColor: TAG_COLORS[0],
    });
  };

  /**
   * Update an existing tag
   */
  handleUpdateTag = async () => {
    const { editingTag, newTagName, newTagColor } = this.state;
    if (!editingTag || !newTagName.trim()) return;

    await dbManager.updateTag(editingTag.id, {
      name: newTagName.trim(),
      color: newTagColor,
    });

    await this.loadTags();
    this.setState({
      showCreateModal: false,
      editingTag: null,
      newTagName: '',
      newTagColor: TAG_COLORS[0],
    });
  };

  /**
   * Delete a tag and all its group assignments
   */
  handleDeleteTag = async (tagId: string) => {
    this.setState({ showDeleteConfirm: true, tagToDelete: tagId });
  };

  confirmDeleteTag = async () => {
    const { tagToDelete } = this.state;
    if (!tagToDelete) return;

    await dbManager.deleteTag(tagToDelete);
    await this.loadTags();
    await this.loadAssignments();
    
    if (this.state.selectedTagId === tagToDelete) {
      this.setState({ 
        selectedTagId: null, 
        selectedGroupIds: new Set(),
        savedGroupIds: new Set(),
        hasUnsavedChanges: false,
        showDeleteConfirm: false,
        tagToDelete: null
      });
    } else {
      this.setState({ showDeleteConfirm: false, tagToDelete: null });
    }
  };

  cancelDeleteTag = () => {
    this.setState({ showDeleteConfirm: false, tagToDelete: null });
  };

  /**
   * Select a tag and load its assigned groups
   */
  handleSelectTag = async (tagId: string) => {
    this.setState({ selectedTagId: tagId, hasUnsavedChanges: false });
    
    // Reload groups if empty (in case they weren't loaded initially)
    if (this.state.groups.length === 0) {
      await this.loadGroups(true);
    }
    
    // Load assigned groups for this tag
    const assignments = await dbManager.getGroupsForTag(tagId);
    const groupIds = new Set(assignments.map(a => a.groupId));
    this.setState({ 
      selectedGroupIds: new Set(groupIds), // Pending selections
      savedGroupIds: new Set(groupIds) // What's actually saved
    });
  };

  /**
   * Toggle group selection (pending, not yet saved)
   */
  handleToggleGroup = (groupId: string) => {
    const { selectedTagId, selectedGroupIds } = this.state;
    if (!selectedTagId) return;

    const newSelectedIds = new Set(selectedGroupIds);
    
    if (newSelectedIds.has(groupId)) {
      newSelectedIds.delete(groupId);
    } else {
      newSelectedIds.add(groupId);
    }

    // Check if there are unsaved changes
    const hasChanges = !this.setsAreEqual(newSelectedIds, this.state.savedGroupIds);
    
    this.setState({ 
      selectedGroupIds: newSelectedIds,
      hasUnsavedChanges: hasChanges
    });
  };

  /**
   * Compare two sets for equality
   */
  setsAreEqual = (set1: Set<string>, set2: Set<string>): boolean => {
    if (set1.size !== set2.size) return false;
    for (const item of set1) {
      if (!set2.has(item)) return false;
    }
    return true;
  };

  /**
   * Save all pending group assignments to the database
   */
  handleSaveGroups = async () => {
    const { selectedTagId, selectedGroupIds, savedGroupIds, groups } = this.state;
    if (!selectedTagId) return;

    try {
      // Find groups to add and remove
      const toAdd = Array.from(selectedGroupIds).filter(id => !savedGroupIds.has(id));
      const toRemove = Array.from(savedGroupIds).filter(id => !selectedGroupIds.has(id));

      // Add new assignments
      for (const groupId of toAdd) {
        const group = groups.find(g => g.id === groupId);
        if (group) {
          await dbManager.assignGroupToTag(selectedTagId, groupId, group.name);
        }
      }

      // Remove unassigned groups
      for (const groupId of toRemove) {
        await dbManager.unassignGroupFromTag(selectedTagId, groupId);
      }

      // Update state
      await this.loadAssignments();
      this.setState({ 
        savedGroupIds: new Set(selectedGroupIds),
        hasUnsavedChanges: false
      });
    } catch (error) {
      console.error('Failed to save groups:', error);
      alert('Failed to save groups. Please try again.');
    }
  };

  openCreateModal = () => {
    this.setState({
      showCreateModal: true,
      editingTag: null,
      newTagName: '',
      newTagColor: TAG_COLORS[0],
    });
  };

  openEditModal = (tag: Tag) => {
    this.setState({
      showCreateModal: true,
      editingTag: tag,
      newTagName: tag.name,
      newTagColor: tag.color,
    });
  };

  closeModal = () => {
    this.setState({
      showCreateModal: false,
      editingTag: null,
      newTagName: '',
      newTagColor: TAG_COLORS[0],
    });
  };

  /**
   * Filter groups based on search query
   */
  getFilteredGroups = () => {
    const { groups, searchQuery } = this.state;
    if (!searchQuery.trim()) return groups;
    
    const query = searchQuery.toLowerCase();
    return groups.filter(g => g.name.toLowerCase().includes(query));
  };

  render() {
    const {
      tags,
      isLoading,
      isLoadingGroups,
      groupsLoadError,
      showCreateModal,
      showDeleteConfirm,
      tagToDelete,
      editingTag,
      newTagName,
      newTagColor,
      selectedTagId,
      selectedGroupIds,
      searchQuery,
      assignments,
      hasUnsavedChanges,
    } = this.state;

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      );
    }

    const filteredGroups = this.getFilteredGroups();
    const selectedTag = tags.find(t => t.id === selectedTagId);
    const tagToDeleteObj = tags.find(t => t.id === tagToDelete);

    return (
      <div className="p-4">
        {/* Create Tag Button */}
        <button
          onClick={this.openCreateModal}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg mb-4 transition-colors"
        >
          + Create New Tag
        </button>

        {/* Tags List */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Your Tags</h3>
          {tags.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No tags yet. Create one to get started!
            </p>
          ) : (
            <div className="space-y-2">
              {tags.map(tag => {
                const tagAssignments = assignments.filter(a => a.tagId === tag.id);
                return (
                  <div
                    key={tag.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTagId === tag.id
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => this.handleSelectTag(tag.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {tag.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({tagAssignments.length} groups)
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            this.openEditModal(tag);
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            this.handleDeleteTag(tag.id);
                          }}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Group Assignment Section */}
        {selectedTag && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Assign Groups to "{selectedTag.name}"
              </h3>
              {this.state.groups.length === 0 && !this.state.isLoadingGroups && (
                <button
                  onClick={() => this.loadGroups(true)}
                  className="text-xs text-green-600 dark:text-green-400 hover:underline"
                  title="Reload groups"
                >
                  🔄 Reload
                </button>
              )}
            </div>

            {/* Loading State */}
            {this.state.isLoadingGroups && (
              <div className="text-center py-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading groups...</div>
              </div>
            )}

            {/* Error State */}
            {this.state.groupsLoadError && !this.state.isLoadingGroups && (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                  {this.state.groupsLoadError}
                </p>
                <button
                  onClick={() => this.loadGroups(true)}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
                >
                  Try Again
                </button>
              </div>
            )}
            
            {/* Search */}
            {this.state.groups.length > 0 && (
              <input
                type="text"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => this.setState({ searchQuery: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-3 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            )}

            {/* Groups List */}
            {!this.state.isLoadingGroups && (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {filteredGroups.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    {searchQuery ? 'No groups found' : this.state.groupsLoadError ? 'Failed to load groups' : 'No WhatsApp groups available'}
                  </p>
                ) : (
                  filteredGroups.map(group => (
                    <label
                      key={group.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroupIds.has(group.id)}
                        onChange={() => this.handleToggleGroup(group.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {group.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}

            {/* Save Button - Only show when there are unsaved changes */}
            {this.state.hasUnsavedChanges && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={this.handleSaveGroups}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md"
                >
                  💾 Save Groups ({selectedGroupIds.size} selected)
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  Changes will be saved to this tag
                </p>
              </div>
            )}

            {/* Saved indicator */}
            {!this.state.hasUnsavedChanges && this.state.selectedGroupIds.size > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-green-600 dark:text-green-400 text-center">
                  ✓ {this.state.selectedGroupIds.size} group(s) saved to this tag
                </p>
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-80">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                {editingTag ? 'Edit Tag' : 'Create New Tag'}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tag Name
                </label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => {
                    // Direct state update without debouncing for immediate response
                    this.setState({ newTagName: e.target.value });
                  }}
                  placeholder="Enter tag name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tag Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {TAG_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => this.setState({ newTagColor: color })}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        newTagColor === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={this.closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingTag ? this.handleUpdateTag : this.handleCreateTag}
                  disabled={!newTagName.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {editingTag ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && tagToDeleteObj && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-2xl">
              <div className="text-center mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                  <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Delete Tag
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Are you sure you want to delete the tag
                </p>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tagToDeleteObj.color }}
                  />
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    "{tagToDeleteObj.name}"
                  </span>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  All group assignments will be permanently removed!
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={this.cancelDeleteTag}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={this.confirmDeleteTag}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-red-500/50"
                >
                  Delete Tag
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default CreateTags;
