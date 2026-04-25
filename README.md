# AutoLend: Bitcoin-Powered Peer-to-Peer Lending

AutoLend is a high-fidelity, decentralized lending platform that utilizes Bitcoin's scripting capabilities to facilitate secure, peer-to-peer loan agreements. This repository contains the complete migration from a simulated environment to a real Bitcoin RegTest backend.

## 🏗 Architecture

The project is divided into three primary components:

1.  **Frontend (`autolend-frontend`)**: A modern Next.js 14 application featuring a "Kinetic Obsidian" aesthetic.
    *   **Sparkles Entry**: An immersive, localized particle animation splash screen.
    *   **Dashboard**: Real-time tracking of loan applications and active agreements.
2.  **Backend (`autolend-backend`)**: A Node.js Express server managing the application logic and state.
    *   **Mongoose Models**: Updated to track on-chain transaction IDs, redeem scripts, and PSBT states.
    *   **Bitcoin Wrapper**: A bridge that executes the Rust binary to perform cryptographic operations.
3.  **Bitcoin Bridge (`autolend-bitcoin`)**: A high-performance Rust binary designed for Bitcoin-specific tasks.
    *   **Multisig Escrow**: Handles 2-of-3 P2WSH script creation.
    *   **PSBT Management**: Orchestrates the building, signing, and broadcasting of Partially Signed Bitcoin Transactions.
    *   **Timelocks**: Implements CLTV (CheckLockTimeVerify) for default protection.

## 🚀 Getting Started

### Prerequisites

*   **Node.js**: v18+
*   **Rust**: v1.70+
*   **Bitcoin Core**: v25.0+ (with `bitcoind` and `bitcoin-cli` in your PATH)

### 1. Setup Bitcoin RegTest

Run the automation script to initialize the RegTest node, create a legacy wallet, and mine the initial blocks:

```bash
chmod +x scripts/setup-regtest.sh
./scripts/setup-regtest.sh
```

### 2. Build the Bitcoin Bridge

```bash
cd autolend-bitcoin
cargo build --release --features regtest
```

### 3. Initialize Backend

```bash
cd autolend-backend
npm install
# Ensure your .env is configured with:
# BITCOIN_RPC_URL=http://127.0.0.1:18443
# BITCOIN_RPC_USER=admin
# BITCOIN_RPC_PASS=adminpass
npm start
```

### 4. Launch Frontend

```bash
cd autolend-frontend
npm install
npm run dev
```

## 🧪 Integration Testing

To verify the full end-to-end flow (Wallet Creation -> Escrow Funding -> PSBT Signing -> Settlement), run:

```bash
chmod +x scripts/test-bitcoin-flow.sh
./scripts/test-bitcoin-flow.sh
```

## 🔐 Key Security Features

*   **Non-Custodial Escrow**: Funds are locked in a 2-of-3 multisig script where the platform cannot move funds without either the lender or customer signature.
*   **On-Chain Verification**: The backend verifies all payments directly against the RegTest node using the Rust bridge.
*   **Default Protection**: Timelocked scripts ensure that collateral can be recovered in the event of a payment default.

## 🎨 Visual Aesthetics

The platform uses a custom design system with:
*   **Glassmorphism** and vibrant gradients.
*   **Framer Motion** for smooth transitions.
*   **Aceternity UI** inspired components for a premium feel.
