# Monopoly Banker

A digital companion application for the classic Monopoly board game. This app replaces the physical paper money and title deeds with a streamlined digital interface, making gameplay faster and easier to manage while preventing calculation errors.

## Features

- **Player Management**: Easily add, edit, and remove players from the current game.
- **Digital Banking**: Handle all monetary transactions including salary collection, tax payments, fines, and direct player-to-player transfers.
- **Property Portfolio**: Track ownership of all board properties. The app visually groups properties by color sets and tracks current mortgage statuses, houses, and hotels.
- **Trading System**: A dedicated trading interface that allows players to exchange money and properties in single atomic transactions. 
- **Transaction History**: A comprehensive log of every action taken in the game, allowing players to audit past turns and resolve disputes.
- **Persistent State**: Game state is automatically saved. If the app is closed accidentally, your session will resume exactly where you left off.
- **Cross-Platform**: Built to run seamlessly on iOS, Android, and Web browsers.

## Tech Stack

This project is a React Native application built with the Expo framework, housed within a pnpm workspace monorepo.

- **Framework**: React Native with Expo
- **Routing**: Expo Router (file-based routing)
- **State Management**: Zustand (with AsyncStorage for persistence)
- **Styling**: Native StyleSheet & customized styling hooks
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js (version 22 recommended)
- pnpm (version 11 recommended)

### Installation

1. Clone the repository
2. Install dependencies across the workspace:
```bash
pnpm install
```

### Running Locally

To start the development server, navigate to the main app directory and use the standard Expo commands:

```bash
cd artifacts/monopoly-banker
pnpm dev
```

You can run specific platforms with:
- `pnpm web` (Starts the application in your web browser)
- `pnpm android` (Starts the application on a connected Android device or emulator)
- `pnpm ios` (Starts the application on an iOS simulator)

## CI/CD & Builds

This repository is configured with GitHub Actions to automatically build Android Application Packages (APKs) using Expo Application Services (EAS). 

Whenever code is pushed to the `main` branch, the workflow will trigger, and the resulting `.apk` file will be uploaded as a build artifact attached to the GitHub Action run.

### EAS Configuration
- **Preview Profile**: Generates a standard `.apk` suitable for side-loading and direct device installation.
- **Production Profile**: Generates an `.aab` (Android App Bundle) required for Google Play Store distribution.

## License

This project is open-source and available under standard open-source terms.
