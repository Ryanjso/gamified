import type React from 'react';
import { createRoot } from 'react-dom/client';
import { type RefObject, useEffect, useState, useRef } from 'react';

// Types for the hook parameters
export interface CollectingAnimationOptions {
  sourceRef: RefObject<HTMLElement | null>;
  targetRef: RefObject<HTMLElement | null>;
  elements: React.ReactNode[];
  count?: number;
  batchCount?: number;
  batchDelay?: number;
  elementSize?: number;
  durationRange?: [number, number];
  arcHeightRange?: [number, number];
  pathRandomness?: number;
  startOffsetRange?: [number, number];
  endOffsetRange?: [number, number];
  zIndexRange?: [number, number];
  shrinkAtEnd?: number; // Value between 0-1 that represents the shrink amount
  onComplete?: () => void;
  onReached?: () => void; // Callback for when first element reaches threshold
  reachThreshold?: number; // Percentage of journey when element is considered "reaching" target (0-1)
  debug?: boolean; // Enable debug mode
}

// Default values
const DEFAULT_OPTIONS = {
  count: 15,
  batchCount: 3,
  batchDelay: 300,
  elementSize: 30,
  durationRange: [800, 1500] as [number, number],
  arcHeightRange: [80, 150] as [number, number],
  pathRandomness: 50,
  startOffsetRange: [-15, 15] as [number, number],
  endOffsetRange: [-20, 20] as [number, number],
  zIndexRange: [9000, 9100] as [number, number],
  shrinkAtEnd: 0.3, // Default shrink amount (30%)
  reachThreshold: 0.85, // Default: element is "reaching" at 85% of journey
  debug: false, // Debug mode off by default
};

// Type for active animation data
interface ActiveAnimation {
  element: HTMLElement;
  mountedRoot: ReturnType<typeof createRoot> | null;
  animationFrameId?: number; // Store animation frame ID
  cleanup: () => void;
}

export const useCollectingAnimation = (options: CollectingAnimationOptions) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isReachingTarget, setIsReachingTarget] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [reachingCount, setReachingCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Keep track of all active animations
  const activeAnimationsRef = useRef<ActiveAnimation[]>([]);

  // Keep track of all timeout IDs
  const timeoutIdsRef = useRef<number[]>([]);

  // Reference to the animation container
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Track animation instances to handle multiple concurrent animations
  const animationInstancesRef = useRef<
    {
      id: number;
      hasCalledOnReached: boolean;
      elementsCount: number;
      completedCount: number;
      reachingCount: number;
    }[]
  >([]);

  // Counter for generating unique animation IDs
  const nextAnimationIdRef = useRef(1);

  // Cleanup function to remove any lingering elements when component unmounts
  useEffect(() => {
    return () => {
      // Clear all timeouts
      timeoutIdsRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      timeoutIdsRef.current = [];

      // Clean up all active animations
      activeAnimationsRef.current.forEach((animation) => {
        if (animation.animationFrameId) {
          cancelAnimationFrame(animation.animationFrameId);
        }
        animation.cleanup();
      });
      activeAnimationsRef.current = [];

      // Remove the container if it exists
      if (containerRef.current) {
        document.body.removeChild(containerRef.current);
        containerRef.current = null;
      }
    };
  }, []);

  // Helper function to get a random number between min and max
  const getRandomNumber = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  // Helper function to get a random item from an array
  const getRandomItem = <T>(array: T[]): T => {
    return array[Math.floor(Math.random() * array.length)];
  };

  // Helper function to log debug info if debug mode is enabled
  const logDebug = (message: string) => {
    if (options.debug) {
      console.log(`[CollectingAnimation] ${message}`);
      setDebugInfo(message);
    }
  };

  // Helper function to measure the size of a rendered element
  const measureElementSize = (element: HTMLElement): { width: number; height: number } => {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
    };
  };

  // Helper function to ensure the animation container exists
  const ensureContainer = () => {
    const minZIndex = options.zIndexRange?.[0] || DEFAULT_OPTIONS.zIndexRange[0];

    if (!containerRef.current) {
      const container = document.createElement('div');
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: ${minZIndex - 1};
        overflow: hidden;
      `;
      document.body.appendChild(container);
      containerRef.current = container;
    }
    return containerRef.current;
  };

  // Helper function to update state based on all active animations
  const updateAnimationState = () => {
    const instances = animationInstancesRef.current;

    // Calculate totals across all animation instances
    const totalElements = instances.reduce((sum, instance) => sum + instance.elementsCount, 0);
    const totalCompleted = instances.reduce((sum, instance) => sum + instance.completedCount, 0);
    const totalReaching = instances.reduce((sum, instance) => sum + instance.reachingCount, 0);

    // Update state
    setTotalCount(totalElements);
    setCompletedCount(totalCompleted);
    setReachingCount(totalReaching);
    setIsAnimating(instances.length > 0);
    setIsReachingTarget(totalReaching > 0);
  };

  const startAnimation = () => {
    const {
      sourceRef,
      targetRef,
      elements,
      count = DEFAULT_OPTIONS.count,
      batchCount = DEFAULT_OPTIONS.batchCount,
      batchDelay = DEFAULT_OPTIONS.batchDelay,
      onReached,
    } = options;

    if (!sourceRef.current || !targetRef.current || elements.length === 0) {
      logDebug('Missing required parameters for animation');
      return;
    }

    // Create a new animation instance with a unique ID
    const animationId = nextAnimationIdRef.current++;
    const animationInstance = {
      id: animationId,
      hasCalledOnReached: false,
      elementsCount: count,
      completedCount: 0,
      reachingCount: 0,
    };

    // Add to active animations
    animationInstancesRef.current.push(animationInstance);

    // Update state to reflect the new animation
    updateAnimationState();

    // Ensure we have a container
    ensureContainer();

    const elementsPerBatch = Math.ceil(count / batchCount);

    logDebug(`Starting animation ${animationId} with ${count} elements in ${batchCount} batches`);

    // Spawn multiple batches of elements
    for (let batch = 0; batch < batchCount; batch++) {
      // Spawn multiple elements in each batch with slight delays
      const elementsInThisBatch = Math.min(elementsPerBatch, count - batch * elementsPerBatch);

      for (let i = 0; i < elementsInThisBatch; i++) {
        // Random delay for a more natural effect
        const delay = batch * batchDelay + getRandomNumber(0, 200);
        const timeoutId = window.setTimeout(() => {
          createFloatingElement(elements, animationId, onReached);
          // Remove this timeout ID from the tracking array once it's executed
          timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
        }, delay);

        // Track the timeout ID
        timeoutIdsRef.current.push(timeoutId);
      }
    }
  };

  const createFloatingElement = (elements: React.ReactNode[], animationId: number, onReached?: () => void) => {
    const {
      sourceRef,
      targetRef,
      elementSize = DEFAULT_OPTIONS.elementSize,
      durationRange = DEFAULT_OPTIONS.durationRange,
      arcHeightRange = DEFAULT_OPTIONS.arcHeightRange,
      pathRandomness = DEFAULT_OPTIONS.pathRandomness,
      startOffsetRange = DEFAULT_OPTIONS.startOffsetRange,
      endOffsetRange = DEFAULT_OPTIONS.endOffsetRange,
      zIndexRange = DEFAULT_OPTIONS.zIndexRange,
      shrinkAtEnd = DEFAULT_OPTIONS.shrinkAtEnd,
      reachThreshold = DEFAULT_OPTIONS.reachThreshold,
      onComplete,
    } = options;

    // Get the current source and target positions
    if (!sourceRef.current || !targetRef.current) return;
    const sourceRect = sourceRef.current.getBoundingClientRect();
    const targetRect = targetRef.current.getBoundingClientRect();

    // Create element container dynamically
    const elementContainer = document.createElement('div');
    elementContainer.classList.add('floating-element');

    // Set initial styles for the container
    elementContainer.style.cssText = `
      position: fixed;
      pointer-events: none;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transform-origin: center center;
      z-index: ${Math.floor(getRandomNumber(zIndexRange[0], zIndexRange[1]))} !important;
    `;

    // Add to our fixed container
    const container = ensureContainer();
    container.appendChild(elementContainer);

    // Random element from the provided array
    const randomElement = getRandomItem(elements);

    // We'll use this variable to store a React root if we render a JSX element
    let mountedRoot: ReturnType<typeof createRoot> | null = null;

    // Default size to use if we can't measure
    let actualWidth = elementSize;
    let actualHeight = elementSize;

    // Create the active animation object with a placeholder for animationFrameId
    const activeAnimation: ActiveAnimation = {
      element: elementContainer,
      mountedRoot: null,
      cleanup: () => {
        if (mountedRoot) {
          mountedRoot.unmount();
        }
        if (elementContainer.parentNode) {
          elementContainer.parentNode.removeChild(elementContainer);
        }
        // Cancel animation frame if it exists
        if (activeAnimation.animationFrameId) {
          cancelAnimationFrame(activeAnimation.animationFrameId);
        }
        // Remove from active animations
        activeAnimationsRef.current = activeAnimationsRef.current.filter((a) => a.element !== elementContainer);
      },
    };

    // Add to active animations
    activeAnimationsRef.current.push(activeAnimation);

    // If the random element is a string or number, render it as text/html.
    // Otherwise, assume it's a JSX element and render it using React.
    if (typeof randomElement === 'string' || typeof randomElement === 'number') {
      elementContainer.innerHTML = randomElement.toString();
      // For simple content, we apply our default dimensions.
      elementContainer.style.width = `${elementSize}px`;
      elementContainer.style.height = `${elementSize}px`;
      elementContainer.style.fontSize = `${elementSize * 0.6}px`;

      // Continue with animation setup
      setupAnimation(actualWidth, actualHeight);
    } else {
      // For JSX elements, we need to render them first, then measure

      // Create a temporary container to render and measure the element
      const measureContainer = document.createElement('div');
      measureContainer.style.cssText = `
        position: absolute;
        visibility: hidden;
        top: -9999px;
        left: -9999px;
        width: auto;
        height: auto;
        display: block;
      `;
      document.body.appendChild(measureContainer);

      // Render the JSX element into the temporary container
      const measureRoot = createRoot(measureContainer);
      measureRoot.render(randomElement);

      // Wait a tick for the element to render
      const timeoutId = window.setTimeout(() => {
        // Remove this timeout ID from the tracking array
        timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);

        // Measure the rendered element
        const { width, height } = measureElementSize(measureContainer);

        // Use the measured dimensions or fallback to default
        actualWidth = width > 0 ? width : elementSize;
        actualHeight = height > 0 ? height : elementSize;

        logDebug(`Measured element size: ${actualWidth}px x ${actualHeight}px`);

        // Clean up the measurement container
        measureRoot.unmount();
        measureContainer.remove();

        // Now render the actual element in our animation container
        const root = createRoot(elementContainer);
        root.render(randomElement);
        mountedRoot = root;
        activeAnimation.mountedRoot = root;

        // Set the measured dimensions on the container
        elementContainer.style.width = `${actualWidth}px`;
        elementContainer.style.height = `${actualHeight}px`;

        // Continue with animation setup now that we have the correct size
        setupAnimation(actualWidth, actualHeight);
      }, 0);

      // Track the timeout ID
      timeoutIdsRef.current.push(timeoutId);
    }

    // Setup the animation with the correct element size
    function setupAnimation(width: number, height: number) {
      // Random starting position with a slight offset from center
      const startXOffset = getRandomNumber(startOffsetRange[0], startOffsetRange[1]);
      const startYOffset = getRandomNumber(startOffsetRange[0], startOffsetRange[1]);
      const startX = sourceRect.left + sourceRect.width / 2 + startXOffset;
      const startY = sourceRect.top + sourceRect.height / 2 + startYOffset;

      // Random ending position with a slight offset from center
      const endXOffset = getRandomNumber(endOffsetRange[0], endOffsetRange[1]);
      const endYOffset = getRandomNumber(endOffsetRange[0], endOffsetRange[1]);
      const endX = targetRect.left + targetRect.width / 2 + endXOffset;
      const endY = targetRect.top + targetRect.height / 2 + endYOffset;

      // Position the element at the start position (only set once)
      elementContainer.style.left = `${startX}px`;
      elementContainer.style.top = `${startY}px`;
      // Use transform for all subsequent position changes
      elementContainer.style.transform = `translate(${-width / 2}px, ${-height / 2}px)`;

      // Random animation duration
      const duration = getRandomNumber(durationRange[0], durationRange[1]);
      // Random arc height
      const arcHeight = getRandomNumber(arcHeightRange[0], arcHeightRange[1]);
      // Random horizontal control point offset
      const controlXOffset = getRandomNumber(-pathRandomness, pathRandomness);

      // Calculate the minimum scale (1 - shrinkAtEnd)
      const minScale = Math.max(1 - shrinkAtEnd, 0.01); // Ensure it doesn't go below 1%

      logDebug(`Element animation: shrinkAtEnd=${shrinkAtEnd}, minScale=${minScale}, size=${width}x${height}px`);

      // Track if this element has triggered the "reaching" state
      let hasTriggeredReaching = false;

      // Animation function using requestAnimationFrame
      const animateElement = () => {
        const startTime = performance.now();

        const animate = (currentTime: number) => {
          // Find the animation instance
          const instance = animationInstancesRef.current.find((a) => a.id === animationId);

          // If the instance no longer exists, clean up and exit
          if (!instance) {
            activeAnimation.cleanup();
            return;
          }

          // Get the current source and target positions (in case they've moved)
          const currentSourceRect = sourceRef.current?.getBoundingClientRect() || sourceRect;
          const currentTargetRect = targetRef.current?.getBoundingClientRect() || targetRect;

          // Calculate the current positions
          const currentStartX = currentSourceRect.left + currentSourceRect.width / 2 + startXOffset;
          const currentStartY = currentSourceRect.top + currentSourceRect.height / 2 + startYOffset;
          const currentEndX = currentTargetRect.left + currentTargetRect.width / 2 + endXOffset;
          const currentEndY = currentTargetRect.top + currentTargetRect.height / 2 + endYOffset;

          // Calculate the control point
          const currentControlX = currentStartX + (currentEndX - currentStartX) * 0.5 + controlXOffset;
          const currentControlY = currentStartY - arcHeight;

          const elapsedTime = currentTime - startTime;
          const progress = Math.min(elapsedTime / duration, 1);

          if (progress < 1) {
            const t = progress;
            const u = 1 - t;

            // Quadratic bezier curve calculation with current positions
            const x = u * u * currentStartX + 2 * u * t * currentControlX + t * t * currentEndX;
            const y = u * u * currentStartY + 2 * u * t * currentControlY + t * t * currentEndY;

            // Scale calculation - ensure it doesn't go below minScale
            let scale = 1;
            if (progress > 0.7) {
              // Calculate scale based on progress in the final 30% of the animation
              const shrinkProgress = (progress - 0.7) / 0.3;
              scale = 1 - shrinkProgress * shrinkAtEnd;

              // Ensure scale doesn't go below minScale
              scale = Math.max(scale, minScale);
            }

            // Apply position and scale
            elementContainer.style.transform = `translate(${x - startX - (width / 2) * scale}px, ${
              y - startY - (height / 2) * scale
            }px) scale(${scale})`;

            // Check if element is reaching the target
            if (!hasTriggeredReaching && progress >= reachThreshold) {
              hasTriggeredReaching = true;

              // Update the instance's reaching count
              instance.reachingCount++;

              // Call onReached only once per animation instance
              if (!instance.hasCalledOnReached && onReached) {
                instance.hasCalledOnReached = true;
                onReached();
                logDebug(`onReached callback fired for animation ${animationId}`);
              }

              // Update state
              updateAnimationState();
            }

            // Store the animation frame ID so we can cancel it if needed
            activeAnimation.animationFrameId = requestAnimationFrame(animate);
          } else {
            // Animation complete, clean up
            activeAnimation.cleanup();

            // Update the instance's completed count
            if (instance) {
              instance.completedCount++;
              instance.reachingCount = Math.max(0, instance.reachingCount - 1);

              // Check if this animation instance is complete
              if (instance.completedCount >= instance.elementsCount) {
                // Remove this animation instance
                animationInstancesRef.current = animationInstancesRef.current.filter((a) => a.id !== animationId);

                // Call onComplete if provided
                if (onComplete) {
                  onComplete();
                }
              }

              // Update state
              updateAnimationState();
            }
          }
        };

        // Start the animation and store the ID
        activeAnimation.animationFrameId = requestAnimationFrame(animate);
      };

      animateElement();
    }
  };

  return {
    startAnimation,
    isAnimating,
    isReachingTarget,
    reachingCount,
    completedCount,
    totalCount,
    progress: totalCount > 0 ? completedCount / totalCount : 0,
    debugInfo,
  };
};
