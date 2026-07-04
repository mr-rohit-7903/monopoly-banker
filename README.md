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

![React Native](https://img.shields.io/badge/react_native-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![Expo](https://img.shields.io/badge/expo-1C1E24?style=for-the-badge&logo=expo&logoColor=white) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white) ![pnpm](https://img.shields.io/badge/pnpm-%234a4a4a.svg?style=for-the-badge&logo=pnpm&logoColor=f69220)

This project is a React Native application built with the Expo framework, housed within a pnpm workspace monorepo.

- **Framework**: React Native with Expo
- **Routing**: Expo Router (file-based routing)
- **State Management**: Zustand (with AsyncStorage for persistence)
- **Styling**: Native StyleSheet & customized styling hooks
- **Package Manager**: pnpm

## How to Play

1. **Setup**: Have all players gather around the physical Monopoly board. Designate one person to be the "Digital Banker" who will control the app.
2. **Add Players**: In the app's **Players** tab, add everyone who is playing. Everyone starts with the default starting balance (e.g., 1500).
3. **Gameplay**: Roll the dice and move your physical pieces on the board as usual.
4. **Transactions**: Instead of using paper money, use the **Bank** tab to:
   - Collect salary (passing GO)
   - Pay rent to other players
   - Pay taxes, fines, or buy things from the bank
5. **Properties**: When a player buys a property, go to the **Properties** tab. Tap the property and select the player to assign ownership. You can also manage houses, hotels, and mortgages from this screen.
6. **Trading**: If players want to trade properties or money, use the **Trade** tab to select the players involved and input the exact terms of the trade. The app will transfer everything at once.
7. **History**: At any time, check the **History** tab to see a complete log of all transactions, making it easy to audit the game and resolve disputes.


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
