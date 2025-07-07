#!/bin/bash

# Gorbagana Slots Deployment Script
# Make sure you have:
# - Anchor CLI installed
# - Solana CLI configured for Gorbagana
# - GOR tokens in your wallet

echo "🚀 Starting Gorbagana Slots Deployment..."

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Please install it first."
    echo "Visit: https://www.anchor-lang.com/docs/installation"
    exit 1
fi

# Check if Solana is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install it first."
    exit 1
fi

# Set Solana config to Gorbagana
echo "🔧 Configuring Solana CLI for Gorbagana..."
solana config set --url https://rpc.gorbagana.wtf/

# Check wallet balance
echo "💰 Checking wallet balance..."
BALANCE=$(solana balance)
echo "Current balance: $BALANCE"

if [[ "$BALANCE" == "0 SOL" ]]; then
    echo "⚠️  Warning: Your wallet balance is 0. You need GOR tokens to deploy."
    echo "Please fund your wallet with testnet GOR tokens."
    exit 1
fi

# Build the program
echo "🔨 Building smart contract..."
anchor build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check your code."
    exit 1
fi

# Deploy the program
echo "🚀 Deploying to Gorbagana testnet..."
anchor deploy --provider.cluster https://rpc.gorbagana.wtf/

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Copy the program ID from the output above"
    echo "2. Update the program ID in:"
    echo "   - programs/gorbagana_slots/src/lib.rs (declare_id! line)"
    echo "   - src/hooks/useProgram.tsx (PROGRAM_ID constant)"  
    echo "   - Anchor.toml (gorbagana_slots program ID)"
    echo "3. Run 'anchor build && anchor deploy' again"
    echo "4. Update your frontend to use real wallet connection"
    echo ""
    echo "🎮 Your Gorbagana Slots dApp is ready!"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
