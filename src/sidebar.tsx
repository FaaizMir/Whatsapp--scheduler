/**
 * WhatsApp Scheduler - Sidebar Component (Milestone 1)
 * 
 * This is the main UI component that appears as a fixed sidebar on WhatsApp Web.
 * 
 * Features:
 * - Fixed sidebar on the right side of WhatsApp Web
 * - Three-tab navigation: Tags, Schedule Messages, Scheduled Messages
 * - Minimize/Maximize functionality
 * - Auto-injection when WhatsApp Web loads
 * 
 * @author WhatsApp Scheduler Team
 * @milestone 1
 */

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import CreateTags from './components/organisms/CreateTags';
import ScheduleMessages from './components/organisms/ScheduleMessages';
import ScheduledMessagesList from './components/organisms/ScheduledMessagesList';
import { ChevronLeft, ChevronRight, Tag, Calendar, List } from 'lucide-react';

interface SidebarState {
  activeView: 'create-tags' | 'schedule-messages' | 'scheduled-messages';
  isMinimized: boolean;
}

/**
 * Main Sidebar Component
 * Manages the tab navigation and view state
 */
class Sidebar extends React.Component<{}, SidebarState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      activeView: 'create-tags',
      isMinimized: false,
    };
  };

  /**
   * Toggle sidebar minimize/maximize state
   */
  toggleMinimize = () => {
    this.setState({ isMinimized: !this.state.isMinimized });
  };

  /**
   * Switch between different views (tabs)
   */
  setActiveView = (view: SidebarState['activeView']) => {
    this.setState({ activeView: view, isMinimized: false });
  };

  render() {
    const { activeView, isMinimized } = this.state;

    return (
      <div
        id="whatsapp-scheduler-sidebar"
        className={`fixed right-0 top-0 h-full bg-white dark:bg-gray-800 shadow-2xl z-[9999] transition-all duration-300 ${
          isMinimized ? 'w-12' : 'w-96'
        }`}
        style={{
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        {/* Minimize/Maximize Button */}
        <button
          onClick={this.toggleMinimize}
          className="absolute -left-10 top-4 bg-green-600 hover:bg-green-700 text-white p-2 rounded-l-lg shadow-lg transition-colors flex items-center justify-center"
          title={isMinimized ? 'Expand Scheduler' : 'Minimize Scheduler'}
        >
          {isMinimized ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        {!isMinimized && (
          <>
            {/* Header */}
            <div className="bg-green-600 text-white p-4">
              <h2 className="text-xl font-bold">WhatsApp Scheduler</h2>
              <p className="text-xs text-green-100">Bulk Message Manager</p>
            </div>

            {/* Navigation */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => this.setActiveView('create-tags')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-2 text-sm font-medium transition-colors ${
                  activeView === 'create-tags'
                    ? 'bg-green-50 dark:bg-gray-700 text-green-600 dark:text-green-400 border-b-2 border-green-600'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Tag size={16} />
                Tags
              </button>
              <button
                onClick={() => this.setActiveView('schedule-messages')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-2 text-sm font-medium transition-colors ${
                  activeView === 'schedule-messages'
                    ? 'bg-green-50 dark:bg-gray-700 text-green-600 dark:text-green-400 border-b-2 border-green-600'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Calendar size={16} />
                Schedule
              </button>
              <button
                onClick={() => this.setActiveView('scheduled-messages')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-2 text-sm font-medium transition-colors ${
                  activeView === 'scheduled-messages'
                    ? 'bg-green-50 dark:bg-gray-700 text-green-600 dark:text-green-400 border-b-2 border-green-600'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <List size={16} />
                Scheduled
              </button>
            </div>

            {/* Content Area */}
            <div className="overflow-y-auto" style={{ height: 'calc(100vh - 140px)' }}>
              {activeView === 'create-tags' && <CreateTags />}
              {activeView === 'schedule-messages' && <ScheduleMessages />}
              {activeView === 'scheduled-messages' && <ScheduledMessagesList />}
            </div>
          </>
        )}
      </div>
    );
  }
}

/**
 * Inject sidebar into WhatsApp Web page
 * Waits for WhatsApp container to load, then mounts the React component
 */
function injectSidebar() {
  // Check every 500ms if WhatsApp Web has loaded
  const checkWhatsAppLoaded = setInterval(() => {
    const whatsappContainer = document.querySelector('#app');
    
    // Only inject once
    if (whatsappContainer && !document.getElementById('whatsapp-scheduler-sidebar')) {
      clearInterval(checkWhatsAppLoaded);

      // Create container for React app
      const sidebarContainer = document.createElement('div');
      sidebarContainer.id = 'whatsapp-scheduler-root';
      document.body.appendChild(sidebarContainer);

      // Render React component
      const root = createRoot(sidebarContainer);
      root.render(<Sidebar />);

      console.log('WhatsApp Scheduler Sidebar injected successfully');
    }
  }, 500);

  // Stop checking after 30 seconds (prevents infinite loop)
  setTimeout(() => clearInterval(checkWhatsAppLoaded), 30000);
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectSidebar);
} else {
  injectSidebar();
}

export default Sidebar;
