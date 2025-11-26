
# WhatsApp Scheduler Chrome Extension

**A powerful Chrome extension for scheduling and managing bulk WhatsApp messages with advanced tagging and group management.**

## 🎯 Project Overview

This extension allows you to:
- 📋 Create and manage tags for WhatsApp groups
- ⏰ Schedule messages to multiple groups at once
- 🔄 Set up recurring messages (daily/weekly/monthly)
- 📎 Attach files (images, videos, documents, etc.)
- 🎯 Smart tag-based group selection
- 💾 100% local storage (IndexedDB + File System Access API)

## 🚀 Tech Stack

- **TypeScript** + **React** for UI components
- **WPPConnect (@wppconnect/wa-js v3.8.1)** for WhatsApp Web integration
- **Manifest V3** for Chrome Extension
- **IndexedDB** for local data persistence
- **Tailwind CSS** for styling
- **Webpack** for bundling

## 📦 Installation

For now you can download the `extension.zip` file from the [latest release](https://github.com/wppconnect-team/wppconnect-extension/releases/latest) and load it as an [unpacked extension in Chrome](#loading-an-unpacked-extension).

## 🛠️ Development Setup
1. Go to the Extensions page by entering `chrome://extensions` in a new tab.
    - Alternatively, click on the Extensions menu puzzle button and select **Manage Extensions** at the bottom of the menu.
    - Or, click the Chrome menu, hover over **More Tools**, then select **Extensions**.
2. Enable Developer Mode by clicking the toggle switch next to **Developer mode**.
3. Click the **Load unpacked** button and select the `dist` directory.

Now, the Wppconnect Chrome Extension should be loaded in your Chrome browser, and you can start using it immediately.

## Disclaimer

This extension is not affiliated with or endorsed by WhatsApp™ or Facebook™. The use of this extension is at your own risk. The developers are not responsible for any damages, legal consequences, or other liabilities that may arise from the use of this extension.

## Acknowledgments

This project uses the following packages:

- [@wppconnect/wa-js](https://github.com/wppconnect-team/wa-js) (Apache License 2.0)
- [react](https://github.com/facebook/react) (MIT License)
- [react-dom](https://github.com/facebook/react) (MIT License)
- [@types](https://github.com/DefinitelyTyped/DefinitelyTyped) (MIT License)
- [autoprefixer](https://github.com/postcss/autoprefixer) (MIT License)
- [copy-webpack-plugin](https://github.com/webpack-contrib/copy-webpack-plugin) (MIT License)
- [css-loader](https://github.com/webpack-contrib/css-loader) (MIT License)
- [cssnano](https://github.com/cssnano/cssnano) (MIT License)
- [postcss-loader](https://github.com/webpack-contrib/postcss-loader) (MIT License)
- [rimraf](https://github.com/isaacs/rimraf) (ISC License)
- [speed-measure-webpack-plugin](https://github.com/stephencookdev/speed-measure-webpack-plugin) (MIT License)
- [style-loader](https://github.com/webpack-contrib/style-loader) (MIT License)
- [tailwindcss](https://github.com/tailwindlabs/tailwindcss) (MIT License)
- [ts-loader](https://github.com/TypeStrong/ts-loader) (MIT License)
- [typescript](https://github.com/microsoft/TypeScript) (Apache License 2.0)
- [webpack-cli](https://github.com/webpack/webpack-cli) (MIT License)
- [webpack-merge](https://github.com/survivejs/webpack-merge) (MIT License)
- [@playwright/test](https://github.com/microsoft/playwright) (Apache License 2.0)
- [qrcode-terminal](https://github.com/gtanner/qrcode-terminal) (MIT License)
