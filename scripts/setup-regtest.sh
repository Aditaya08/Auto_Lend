#!/bin/bash
set -e

echo "Setting up Bitcoin RegTest Environment..."

# Stop any running instance
bitcoin-cli -regtest -rpcuser=admin -rpcpassword=adminpass stop 2>/dev/null || true
sleep 2

# Clean up any existing bitcoind data for a fresh start
rm -rf ~/.bitcoin/regtest

# Start bitcoind in background
bitcoind -regtest -daemon -fallbackfee=0.00001 -rpcuser=admin -rpcpassword=adminpass -deprecatedrpc=create_bdb

# Wait for it to start
echo "Waiting for bitcoind to start..."
sleep 5

# Create default wallet
bitcoin-cli -regtest -rpcuser=admin -rpcpassword=adminpass -named createwallet wallet_name="default" descriptors=false

# Mine 101 blocks to get mature coinbase rewards
address=$(bitcoin-cli -regtest -rpcuser=admin -rpcpassword=adminpass getnewaddress)
bitcoin-cli -regtest -rpcuser=admin -rpcpassword=adminpass generatetoaddress 101 $address

echo "RegTest Setup Complete! Mined 101 blocks to: $address"
