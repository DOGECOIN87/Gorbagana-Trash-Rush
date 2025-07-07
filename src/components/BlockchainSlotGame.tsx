import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { IMAGES } from '../../assets.tsx';

// Symbol configuration matching smart contract
const SYMBOLS = {
  gorbagana: { id: 0, name: 'gorbagana', payout: 100, weight: 1, img: IMAGES.gorbagana },
  wild: { id: 1, name: 'wild', payout: 50, weight: 2, img: IMAGES.wild },
  bonusChest: { id: 2, name: 'bonusChest', payout: 25, weight: 3, img: IMAGES.bonusChest },
  trash: { id: 3, name: 'trash', payout: 20, weight: 4, img: IMAGES.trashcan },
  takeout: { id: 4, name: 'takeout', payout: 15, weight: 5, img: IMAGES.takeout },
  fish: { id: 5, name: 'fish', payout: 10, weight: 6, img: IMAGES.fish },
  rat: { id: 6, name: 'rat', payout: 5, weight: 7, img: IMAGES.rat },
  banana: { id: 7, name: 'banana', payout: 2, weight: 8, img: IMAGES.banana },
};

type SymbolName = keyof typeof SYMBOLS;
type SymbolId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface BlockchainSlotGameProps {
  wallet?: any;
  onSpin?: (betAmount: number) => Promise<{ symbols: [number, number, number], payout: number }>;
  isConnected?: boolean;
  balance?: number;
}

const REEL_ROWS = 3;
const REEL_COLS = 3;
const DEFAULT_BET_AMOUNT = 0.01; // 0.01 SOL
const SPIN_ANIMATION_DURATION = 1500;
const SPIN_ANIMATION_INTERVAL = 100;

// Convert symbol ID to symbol name
const getSymbolNameById = (id: SymbolId): SymbolName => {
  const symbolEntries = Object.entries(SYMBOLS) as [SymbolName, typeof SYMBOLS[SymbolName]][];
  const found = symbolEntries.find(([_, symbol]) => symbol.id === id);
  return found ? found[0] : 'banana';
};

// Convert symbols array to grid format - only middle row matters for payline
const symbolsToGrid = (symbols: [number, number, number]): SymbolName[][] => {
  const symbolNames = Object.keys(SYMBOLS) as SymbolName[];
  const getRandomSymbol = () => symbolNames[Math.floor(Math.random() * symbolNames.length)];
  
  const paylineSymbols = symbols.map(id => getSymbolNameById(id as SymbolId));
  
  return [
    // Top row - random symbols (visual only)
    [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
    // Middle row - the actual payline from blockchain
    [paylineSymbols[0], paylineSymbols[1], paylineSymbols[2]], 
    // Bottom row - random symbols (visual only)
    [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]
  ];
};

// Create initial random grid
const createInitialGrid = (): SymbolName[][] => {
  const symbolNames = Object.keys(SYMBOLS) as SymbolName[];
  const getRandomSymbol = () => symbolNames[Math.floor(Math.random() * symbolNames.length)];
  return Array(REEL_ROWS).fill(null).map(() => 
    Array(REEL_COLS).fill(null).map(getRandomSymbol)
  );
};

export const BlockchainSlotGame: React.FC<BlockchainSlotGameProps> = ({
  wallet,
  onSpin,
  isConnected = false,
  balance = 0
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [grid, setGrid] = useState<SymbolName[][]>(createInitialGrid);
  const [lastWin, setLastWin] = useState<number>(0);
  const [winningLines, setWinningLines] = useState<number[]>([]);
  const [betAmount, setBetAmount] = useState(DEFAULT_BET_AMOUNT);
  const [error, setError] = useState<string>('');

  // Weighted symbol pool for animations
  const weightedSymbolPool = useMemo<SymbolName[]>(() => {
    const pool: SymbolName[] = [];
    for (const symbolName of Object.keys(SYMBOLS) as SymbolName[]) {
      const symbol = SYMBOLS[symbolName];
      for (let i = 0; i < symbol.weight; i++) {
        pool.push(symbolName);
      }
    }
    return pool;
  }, []);

  const getRandomWeightedSymbol = useCallback((): SymbolName => {
    const randomIndex = Math.floor(Math.random() * weightedSymbolPool.length);
    return weightedSymbolPool[randomIndex];
  }, [weightedSymbolPool]);

  const handleSpin = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (isSpinning) return;

    if (balance < betAmount) {
      setError('Insufficient balance');
      return;
    }

    setIsSpinning(true);
    setLastWin(0);
    setWinningLines([]);
    setError('');

    // Start animation
    const animationInterval = setInterval(() => {
      setGrid(prevGrid =>
        prevGrid.map(row => row.map(() => getRandomWeightedSymbol()))
      );
    }, SPIN_ANIMATION_INTERVAL);

    try {
      let spinResult;
      
      if (onSpin) {
        // Use blockchain spin
        spinResult = await onSpin(betAmount);
      } else {
        // Fallback to local simulation
        const symbols: [number, number, number] = [
          Math.floor(Math.random() * 8),
          Math.floor(Math.random() * 8),
          Math.floor(Math.random() * 8)
        ];
        
        let payout = 0;
        // Only pay out on three matching symbols
        if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
          const symbolData = Object.values(SYMBOLS).find(s => s.id === symbols[0]);
          payout = symbolData ? symbolData.payout * betAmount : 0;
        }
        
        spinResult = { symbols, payout };
      }

      setTimeout(() => {
        clearInterval(animationInterval);
        
        const finalGrid = symbolsToGrid(spinResult.symbols);
        setGrid(finalGrid);
        
        if (spinResult.payout > 0) {
          setLastWin(spinResult.payout);
          setWinningLines([1]); // Only middle row (index 1) is the payline
        }
        
        setIsSpinning(false);
      }, SPIN_ANIMATION_DURATION);

    } catch (error) {
      clearInterval(animationInterval);
      console.error('Spin error:', error);
      setError(error instanceof Error ? error.message : 'Spin failed');
      setIsSpinning(false);
    }
  };

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const titleShadowStyle = (color: string) => ({
    textShadow: `0 0 15px ${color}, 0 2px 2px rgba(0,0,0,0.7)`
  });

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a021d] text-white p-2 antialiased" style={{ fontFamily: "'Exo 2', sans-serif" }}>
      <div className="relative w-full max-w-[420px] min-h-[800px] bg-[#000] rounded-[3rem] p-4 flex flex-col justify-between shadow-[0_0_15px_#0ff,0_0_25px_#f0f,0_0_35px_#f70,inset_0_0_10px_rgba(10,2,29,1)] border border-fuchsia-500/50">

        {/* Wallet Connection Status */}
        <div className="text-center mb-2">
          {isConnected ? (
            <div className="text-green-400 text-sm">
              ✅ Wallet Connected | Balance: {balance.toFixed(4)} SOL
            </div>
          ) : (
            <div className="text-orange-400 text-sm">
              ⚠️ Wallet Not Connected
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-2 mb-2 text-center text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Header */}
        <header>
          <div className="flex justify-between items-center text-yellow-400 font-bold px-2">
            <div className="text-center w-28 py-1 border-2 border-fuchsia-600/50" style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' }}>GRAND</div>
            <div className="w-20 h-6 border-2 border-fuchsia-600/50" style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' }}></div>
            <div className="text-center w-28 py-1 border-2 border-fuchsia-600/50" style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' }}>MINOR</div>
          </div>
          <div className="text-center my-4 select-none">
            <h1 className="text-4xl md:text-5xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-600 drop-shadow-lg" style={titleShadowStyle('rgba(0,255,255,0.5)')}>
                Gorbagana
            </h1>
            <h2 className="text-4xl md:text-5xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-amber-600 -mt-2 drop-shadow-lg" style={titleShadowStyle('rgba(255,165,0,0.5)')}>
                Trash Rush
            </h2>
          </div>
        </header>

        {/* Pay Table */}
        <div className="mb-3 p-2 bg-slate-900/50 rounded-lg border border-fuchsia-500/30">
          <div className="text-center text-yellow-400 font-bold text-xs mb-1 uppercase tracking-wider">
            Pay Table
          </div>
          <div className="flex justify-between items-center gap-1 text-xs">
            {Object.entries(SYMBOLS)
              .sort((a, b) => b[1].payout - a[1].payout)
              .map(([symbolName, symbol]) => (
              <div key={symbolName} className="flex flex-col items-center bg-black/40 rounded p-1 min-w-0 flex-1">
                <img 
                  src={symbol.img} 
                  alt={symbolName} 
                  className="w-4 h-4 object-contain mb-1"
                />
                <div className="text-yellow-400 font-bold text-xs">
                  {(symbol.payout * betAmount).toFixed(3)}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center text-gray-400 text-xs mt-1">
            3 match required • Middle row only
          </div>
        </div>

        {/* Reels */}
        <main className="relative w-full aspect-square p-2 border-2 border-fuchsia-500/80 rounded-2xl shadow-[0_0_25px_rgba(192,38,211,0.5),inset_0_0_15px_rgba(192,38,211,0.3)] bg-black/30">
          <div className="grid grid-cols-3 grid-rows-3 gap-2 h-full">
            {grid.flat().map((symbolName, index) => (
              <div 
                key={index}
                className={`bg-slate-900/50 rounded-lg flex items-center justify-center overflow-hidden transition-all duration-300
                  ${winningLines.includes(Math.floor(index / REEL_COLS)) ? 'shadow-[0_0_15px_5px_#fde047] scale-105 bg-yellow-400/20' : ''}`}
              >
                <img 
                  src={SYMBOLS[symbolName].img} 
                  alt={symbolName} 
                  className="w-full h-full object-contain p-2 transition-transform duration-100 ease-in-out"
                  style={{ transform: isSpinning ? 'scale(0.8) rotate(15deg)' : 'scale(1) rotate(0deg)' }}
                />
              </div>
            ))}
          </div>
        </main>
        
        {/* Controls */}
        <footer className="w-full mt-4">
          {/* Bet Amount Selector */}
          <div className="flex justify-center mb-4">
            <div className="bg-slate-800 rounded-lg p-2 flex items-center gap-2">
              <span className="text-sm text-gray-400">Bet:</span>
              <select 
                value={betAmount} 
                onChange={(e) => setBetAmount(Number(e.target.value))}
                className="bg-slate-700 text-white rounded px-2 py-1 text-sm"
                disabled={isSpinning}
              >
                <option value={0.001}>0.001 SOL</option>
                <option value={0.01}>0.01 SOL</option>
                <option value={0.1}>0.1 SOL</option>
                <option value={0.5}>0.5 SOL</option>
                <option value={1}>1 SOL</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-yellow-400 px-1">
            <div className="text-center border-2 border-fuchsia-500/80 rounded-lg p-2 w-20 h-12 flex items-center justify-center cursor-pointer hover:bg-fuchsia-500/20 transition-colors">
              <span className="uppercase font-bold text-xs tracking-wider">Menu</span>
            </div>

            <div className="flex-grow flex flex-col items-center">
              <div className="relative text-center py-1 px-6 text-yellow-400">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-3xl font-thin transform -scale-x-100" style={{fontFamily:'serif'}}>)</span>
                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-3xl font-thin" style={{fontFamily:'serif'}}>)</span>
                <span className="font-black text-xl tracking-widest">WIN</span>
              </div>
              <div className="text-white text-xl font-bold h-6">{lastWin > 0 ? `${lastWin.toFixed(4)} SOL` : ''}</div>
            </div>

            <button
              onClick={handleSpin}
              disabled={isSpinning || !isConnected || balance < betAmount}
              aria-label={isSpinning ? 'Spinning...' : 'Spin the reels'}
              className="w-16 h-16 rounded-full bg-gradient-to-b from-blue-500 to-indigo-800 text-white font-black text-lg uppercase shadow-[0_5px_15px_rgba(0,0,0,0.5),inset_0_-4px_10px_rgba(0,0,0,0.8),inset_0_2px_2px_rgba(255,255,255,0.2)] border-2 border-blue-300/50 transition-all duration-150 disabled:from-gray-600 disabled:to-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none active:translate-y-1 active:shadow-[0_2px_5px_rgba(0,0,0,0.5),inset_0_-2px_5px_rgba(0,0,0,0.8)]"
            >
              {isSpinning ? (
                <div className="animate-spin">⟳</div>
              ) : (
                'Spin'
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
