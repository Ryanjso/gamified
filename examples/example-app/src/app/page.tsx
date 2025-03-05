'use client';

import { useCollectingAnimation } from 'gamified';
import { useEffect, useRef, useState } from 'react';
import { CountUp } from 'use-count-up';

export default function Home() {
  const fromRef = useRef<HTMLButtonElement>(null);
  const toRef = useRef<HTMLDivElement>(null);

  const [balance, setBalance] = useState(500);
  const [isDebug, setIsDebug] = useState(false);

  const onCoinsReachedTarget = () => {
    setBalance((balance) => balance + 500);
  };

  const { startAnimation, debugInfo, isReachingTarget } = useCollectingAnimation({
    sourceRef: fromRef,
    targetRef: toRef,
    elements: ['🪙'],
    shrinkAtEnd: 0,
    endOffsetRange: [0, 0],
    arcHeightRange: [300, 500],
    batchCount: 2,
    batchDelay: 200,
    count: 22,
    zIndexRange: [1000, 1100],
    debug: isDebug,
    elementSize: 50,
    startOffsetRange: [-10, 10],
    durationRange: [800, 1300],
    onReached: onCoinsReachedTarget,
  });

  // while is reaching target play coin sound every 200ms
  useEffect(() => {
    if (isReachingTarget) {
      const interval = setInterval(() => {
        // coin-sound.mp3
        const audio = new Audio('coin-sound.mp3');
        audio.play();
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isReachingTarget]);

  const handleButtonClick = () => {
    // play pop sound
    const audio = new Audio('pop.mp3');
    audio.play();
    startAnimation();
  };

  return (
    <div>
      <div className="h-full min-h-screen flex flex-col p-6">
        <div className="flex justify-end">
          <div className="rounded-2xl bg-amber-100 flex items-center w-32 justify-between h-14 bg-gradient-to-r from-orange-400 to-orange-500 px-4 font-semibold text-white">
            <span
              className={`text-3xl relative flex z-[2000] items-center justify-center transition-transform duration-300 ${
                isReachingTarget ? 'scale-120' : ''
              }`}
            >
              <span ref={toRef} className="absolute"></span>
              🪙
            </span>
            <CountUp isCounting start={Math.max(balance - 500, 500)} end={balance} duration={1} key={balance} />
          </div>
        </div>
        <div className="flex-grow flex items-center justify-center flex-col space-y-16 px-6">
          <h1 className="text-3xl font-bold text-center">useCollectingAnimation Demo</h1>
          <button
            ref={fromRef}
            className=" z-[20000] active:scale-90 items-center flex space-x-2 transition-transform  py-2 px-4 duration-300 rounded-xl cursor-pointer bg-gradient-to-r from-orange-400 to-orange-500 text-white font-medium"
            onClick={handleButtonClick}
          >
            <span>Claim 500 Coins</span>
            <span className="text-2xl">🪙</span>
          </button>
        </div>
        {isDebug && <p className="bg-red-300 text-center">debug: {debugInfo}</p>}
      </div>
    </div>
  );
}
