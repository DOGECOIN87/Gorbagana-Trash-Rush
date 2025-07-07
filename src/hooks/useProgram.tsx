import { useState, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import * as anchor from '@project-serum/anchor';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Program ID - replace with your actual deployed program ID
const PROGRAM_ID = new PublicKey('PutYourProgramIDHere');

// IDL definition - this should match your Rust program
const IDL = {
  "version": "0.1.0",
  "name": "gorbagana_slots",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "slotsState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "authority",
          "type": "publicKey"
        },
        {
          "name": "treasury",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "spin",
      "accounts": [
        {
          "name": "slotsState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "betAmount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "SlotsState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "initialized",
            "type": "bool"
          },
          {
            "name": "treasury",
            "type": "publicKey"
          },
          {
            "name": "totalSpins",
            "type": "u64"
          },
          {
            "name": "totalPayout",
            "type": "u64"
          },
          {
            "name": "houseEdge",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "SpinRequested",
      "fields": [
        {
          "name": "user",
          "type": "publicKey"
        },
        {
          "name": "betAmount",
          "type": "u64"
        },
        {
          "name": "symbols",
          "type": {
            "array": ["u8", 3]
          }
        }
      ]
    },
    {
      "name": "SpinResult",
      "fields": [
        {
          "name": "user",
          "type": "publicKey"
        },
        {
          "name": "symbols",
          "type": {
            "array": ["u8", 3]
          }
        },
        {
          "name": "payout",
          "type": "u64"
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidBetAmount",
      "msg": "Invalid bet amount"
    },
    {
      "code": 6001,
      "name": "BetTooHigh",
      "msg": "Bet amount too high"
    },
    {
      "code": 6002,
      "name": "InvalidAmount",
      "msg": "Invalid amount"
    }
  ]
};

export const useProgram = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  const program = useMemo(() => {
    if (!wallet.publicKey) return null;

    const provider = new anchor.AnchorProvider(
      connection,
      wallet as any,
      anchor.AnchorProvider.defaultOptions()
    );

    return new anchor.Program(IDL as any, PROGRAM_ID, provider);
  }, [connection, wallet]);

  const [slotsStateAddress] = useMemo(() => {
    if (!wallet.publicKey) return [null];
    
    return PublicKey.findProgramAddressSync(
      [Buffer.from('slots_state'), wallet.publicKey.toBuffer()],
      PROGRAM_ID
    );
  }, [wallet.publicKey]);

  const initializeSlots = async () => {
    if (!program || !wallet.publicKey || !slotsStateAddress) return;

    setIsLoading(true);
    try {
      const tx = await program.methods
        .initialize(wallet.publicKey, wallet.publicKey)
        .accounts({
          slotsState: slotsStateAddress,
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Initialize transaction:', tx);
      return tx;
    } catch (error) {
      console.error('Initialize error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const spinSlots = async (betAmount: number) => {
    if (!program || !wallet.publicKey || !slotsStateAddress) return;

    setIsLoading(true);
    try {
      const betAmountLamports = Math.floor(betAmount * LAMPORTS_PER_SOL);
      
      const tx = await program.methods
        .spin(new anchor.BN(betAmountLamports))
        .accounts({
          slotsState: slotsStateAddress,
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Spin transaction:', tx);
      
      // Listen for events
      const events = await program.account.slotsState.fetch(slotsStateAddress);
      
      return { tx, events };
    } catch (error) {
      console.error('Spin error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getSlotsState = async () => {
    if (!program || !slotsStateAddress) return null;

    try {
      const state = await program.account.slotsState.fetch(slotsStateAddress);
      return state;
    } catch (error) {
      console.log('No slots state found, needs initialization');
      return null;
    }
  };

  return {
    program,
    slotsStateAddress,
    initializeSlots,
    spinSlots,
    getSlotsState,
    isLoading,
  };
};
