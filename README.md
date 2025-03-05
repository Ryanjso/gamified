# Gamified

Gamified is a toolkit for web developers looking to add engaging gamification and reward systems to their applications. Easily animate rewards like coins or tokens—and soon much more!

---

## Live Demo


https://github.com/user-attachments/assets/099e900e-d461-40ee-a096-5e1472e165cf

[https://gamified-example.vercel.app/](https://gamified-example.vercel.app/)

---

## Features

- **Collecting Animation Hook:** Animate items (e.g., coins, tokens) moving from a source element to a target element with customizable physics and timing.
- **Future Components:**
  - Scratch-offs
  - Slot machines
  - Wheel spinners  
    All designed to be easily customizable and compostable.

---

## Installation

Install Gamified via npm:

```bash
npm install gamified
```

---

## Usage

### Collecting Animation Hook

The `useCollectingAnimation` hook allows you to animate the collection of items from one element (the source) to another (the target). It supports a variety of customization options for element size, animation duration, randomness in motion, and more.

#### Example

Below is a sample usage of the hook in a React component:

```jsx
import React, { useRef } from 'react';
import { useCollectingAnimation } from 'gamified';

const App = () => {
  const sourceRef = useRef(null);
  const targetRef = useRef(null);

  const { startAnimation, isAnimating, progress, debugInfo } = useCollectingAnimation({
    sourceRef,
    targetRef,
    elements: ['💰'], // Can be strings, numbers, or JSX elements.
    count: 20, // Total number of items to animate.
    batchCount: 4, // Number of batches to split the animation.
    batchDelay: 250, // Delay (in ms) between batches.
    elementSize: 40, // Size of each animated element.
    onComplete: () => console.log('Animation complete'),
    onReached: () => console.log('First element reached the target'),
    debug: true,
  });

  return (
    <div>
      <div ref={sourceRef} style={{ position: 'absolute', top: 50, left: 50 }}>
        Source
      </div>
      <div ref={targetRef} style={{ position: 'absolute', top: 300, left: 300 }}>
        Target
      </div>
      <button onClick={startAnimation} disabled={isAnimating}>
        Start Animation
      </button>
      <div>Progress: {Math.floor(progress * 100)}%</div>
      {debugInfo && <div>Debug: {debugInfo}</div>}
    </div>
  );
};

export default App;
```

---

### API Reference

#### `useCollectingAnimation(options)`

**Parameters:**

| Option               | Type                     | Default        | Description                                                                  |
| -------------------- | ------------------------ | -------------- | ---------------------------------------------------------------------------- |
| **sourceRef**        | `RefObject<HTMLElement>` | **Required**   | Reference to the source element (starting point) for the animation.          |
| **targetRef**        | `RefObject<HTMLElement>` | **Required**   | Reference to the target element (destination) for the animation.             |
| **elements**         | `React.ReactNode[]`      | **Required**   | Array of elements (icons, tokens, etc.) to animate.                          |
| **count**            | `number`                 | `15`           | Total number of elements to animate.                                         |
| **batchCount**       | `number`                 | `3`            | Number of batches to split the animation into.                               |
| **batchDelay**       | `number` (ms)            | `300`          | Delay between each batch in milliseconds.                                    |
| **elementSize**      | `number` (px)            | `30`           | Size of each animated element.                                               |
| **durationRange**    | `[number, number]`       | `[800, 1500]`  | Range for animation duration (ms).                                           |
| **arcHeightRange**   | `[number, number]`       | `[80, 150]`    | Range for the arc height (px).                                               |
| **pathRandomness**   | `number`                 | `50`           | Degree of randomness for the animation path.                                 |
| **startOffsetRange** | `[number, number]`       | `[-15, 15]`    | Random offset range for the starting position.                               |
| **endOffsetRange**   | `[number, number]`       | `[-20, 20]`    | Random offset range for the ending position.                                 |
| **zIndexRange**      | `[number, number]`       | `[9000, 9100]` | Range for the z-index of the animated elements.                              |
| **shrinkAtEnd**      | `number` (0-1)           | `0.3`          | Fraction to shrink the element by the end of the animation.                  |
| **onComplete**       | `() => void`             | `undefined`    | Callback fired when the entire animation completes.                          |
| **onReached**        | `() => void`             | `undefined`    | Callback fired when the first element reaches the target (threshold).        |
| **reachThreshold**   | `number` (0-1)           | `0.85`         | Progress fraction when an element is considered to be "reaching" the target. |
| **debug**            | `boolean`                | `false`        | Enable debug mode to log internal state and animation details.               |

**Returns:**

An object containing:

- `startAnimation`: Function to trigger the animation.
- `isAnimating`: Boolean flag indicating if an animation is currently in progress.
- `isReachingTarget`: Boolean flag indicating if any element is in the "reaching" state.
- `reachingCount`: Number of elements that have reached the threshold.
- `completedCount`: Number of elements that have completed their animation.
- `totalCount`: Total number of elements scheduled for animation.
- `progress`: Overall animation progress as a fraction (completedCount / totalCount).
- `debugInfo`: Debug messages when debug mode is enabled.

---

## Future Roadmap

Gamified is only getting started! Upcoming components include:

- **Scratch-offs:** Add an interactive layer of chance with digital scratch-off cards.
- **Slot Machines:** Integrate slot machine animations that users can spin for rewards.
- **Wheel Spinners:** Create customizable wheel spinners for prize selection.

All new components will follow the same principles of high customizability and composability, making them easy to integrate into any web application.

---

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests on our [GitHub repository](#).

---

## License

This project is licensed under the MIT License.

---

Elevate your application's engagement with Gamified—where every interaction can be a rewarding experience!
