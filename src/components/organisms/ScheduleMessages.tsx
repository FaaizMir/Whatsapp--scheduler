import * as React from 'react';

class ScheduleMessages extends React.Component {
  render() {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Schedule Messages
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This feature will be implemented in Milestone 2.
        </p>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Coming Soon:</strong>
          </p>
          <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
            <li>Rich text input</li>
            <li>File attachments (images, videos, documents)</li>
            <li>Group & tag selection</li>
            <li>Date & time picker (5-min intervals)</li>
            <li>Repeat options (Daily/Weekly/Monthly)</li>
          </ul>
        </div>
      </div>
    );
  }
}

export default ScheduleMessages;
