#!/bin/bash
set -e

# Path to the rust binary
RUST_BIN="./autolend-bitcoin/target/release/autolend-bitcoin"

export BITCOIN_RPC_URL="http://127.0.0.1:18443"
export BITCOIN_RPC_USER="admin"
export BITCOIN_RPC_PASS="adminpass"

echo "=== Testing Bitcoin Flow ==="

echo "1. Creating Lender Wallet..."
LENDER=$(echo '{"command": "create_wallet", "name": "lender_test"}' | $RUST_BIN)
echo $LENDER

echo "2. Creating Dealer Wallet..."
DEALER=$(echo '{"command": "create_wallet", "name": "dealer_test"}' | $RUST_BIN)
echo $DEALER

echo "3. Creating Customer Wallet..."
CUSTOMER=$(echo '{"command": "create_wallet", "name": "customer_test"}' | $RUST_BIN)
echo $CUSTOMER

LENDER_PK=$(echo $LENDER | jq -r '.data.public_key')
DEALER_PK=$(echo $DEALER | jq -r '.data.public_key')
CUSTOMER_PK=$(echo $CUSTOMER | jq -r '.data.public_key')
LENDER_DESC=$(echo $LENDER | jq -r '.data.descriptor')
DEALER_DESC=$(echo $DEALER | jq -r '.data.descriptor')
CUSTOMER_DESC=$(echo $CUSTOMER | jq -r '.data.descriptor')

echo "4. Funding Lender..."
echo "{\"command\": \"fund_address\", \"address\": \"$(echo $LENDER | jq -r '.data.address')\", \"amount_btc\": 1.5}" | $RUST_BIN

echo "5. Mining a block to confirm..."
echo '{"command": "mine_blocks", "count": 1}' | $RUST_BIN

echo "6. Checking Lender Balance..."
echo "{\"command\": \"get_balance\", \"address\": \"$(echo $LENDER | jq -r '.data.address')\"}" | $RUST_BIN

echo "7. Creating Multisig Escrow..."
MULTISIG=$(echo "{\"command\": \"create_multisig\", \"dealer_pk\": \"$DEALER_PK\", \"lender_pk\": \"$LENDER_PK\", \"customer_pk\": \"$CUSTOMER_PK\"}" | $RUST_BIN)
echo $MULTISIG
ESCROW_ADDR=$(echo $MULTISIG | jq -r '.data.escrow_address')
REDEEM_SCRIPT=$(echo $MULTISIG | jq -r '.data.redeem_script')

echo "8. Funding Escrow..."
echo "{\"command\": \"fund_escrow\", \"escrow_address\": \"$ESCROW_ADDR\", \"amount_btc\": 1.0, \"lender_descriptor\": \"$LENDER_DESC\"}" | $RUST_BIN

echo "9. Mining a block to confirm..."
echo '{"command": "mine_blocks", "count": 1}' | $RUST_BIN

echo "10. Building Release PSBT..."
DEALER_ADDR=$(echo $DEALER | jq -r '.data.address')
PSBT=$(echo "{\"command\": \"build_release_psbt\", \"escrow_address\": \"$ESCROW_ADDR\", \"dealer_address\": \"$DEALER_ADDR\", \"amount_btc\": 1.0, \"redeem_script\": \"$REDEEM_SCRIPT\"}" | $RUST_BIN)
echo $PSBT
PSBT_B64=$(echo $PSBT | jq -r '.data.psbt_base64')

echo "11. Dealer Signs PSBT..."
PSBT_DEALER=$(echo "{\"command\": \"sign_psbt\", \"psbt_base64\": \"$PSBT_B64\", \"signer_descriptor\": \"$DEALER_DESC\"}" | $RUST_BIN)
echo $PSBT_DEALER
PSBT_B64=$(echo $PSBT_DEALER | jq -r '.data.psbt_base64')

echo "12. Customer Signs PSBT..."
PSBT_CUSTOMER=$(echo "{\"command\": \"sign_psbt\", \"psbt_base64\": \"$PSBT_B64\", \"signer_descriptor\": \"$CUSTOMER_DESC\"}" | $RUST_BIN)
echo $PSBT_CUSTOMER
PSBT_B64=$(echo $PSBT_CUSTOMER | jq -r '.data.psbt_base64')

echo "13. Broadcasting PSBT..."
echo "{\"command\": \"broadcast_psbt\", \"psbt_base64\": \"$PSBT_B64\"}" | $RUST_BIN

echo "14. Mining a block to confirm..."
echo '{"command": "mine_blocks", "count": 1}' | $RUST_BIN

echo "15. Checking Dealer Balance..."
echo "{\"command\": \"get_balance\", \"address\": \"$DEALER_ADDR\"}" | $RUST_BIN

echo "16. Sending Repayment..."
REPAYMENT=$(echo "{\"command\": \"send_repayment\", \"customer_descriptor\": \"$CUSTOMER_DESC\", \"lender_address\": \"$(echo $LENDER | jq -r '.data.address')\", \"amount_btc\": 0.1}" | $RUST_BIN)
echo $REPAYMENT
TXID=$(echo $REPAYMENT | jq -r '.data.txid')

echo "17. Checking Tx Status (0 conf)..."
echo "{\"command\": \"get_tx_status\", \"txid\": \"$TXID\"}" | $RUST_BIN

echo "18. Mining a block..."
echo '{"command": "mine_blocks", "count": 1}' | $RUST_BIN

echo "19. Checking Tx Status (1 conf)..."
echo "{\"command\": \"get_tx_status\", \"txid\": \"$TXID\"}" | $RUST_BIN

echo "=== Flow Complete ==="
