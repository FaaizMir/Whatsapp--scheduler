import * as React from 'react';

class ScheduledMessagesList extends React.Component {
  render() {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Scheduled Messages
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This feature will be implemented in Milestone 2.
        </p>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Coming Soon:</strong>
          </p>
          <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
            <li>List/table view of scheduled messages</li>
            <li>Created Time | Scheduled Time | Preview</li>
            <li>File attachments preview</li>
            <li>Status indicators</li>
            <li>Edit / Delete / Send Now actions</li>
          </ul>
        </div>
      </div>
    );
  }
}

export default ScheduledMessagesList;
