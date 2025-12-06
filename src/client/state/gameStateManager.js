/**
 * Game State Management Module
 * Manages game phases and state transitions with a simple state machine
 */

/**
 * Game phase constants
 */
export const GAME_PHASES = {
  BUYING: 'buying',
  SPAWNING: 'spawning'
};

/**
 * Valid state transitions
 * Maps current phase to allowed next phases
 */
const VALID_TRANSITIONS = {
  [GAME_PHASES.BUYING]: [GAME_PHASES.SPAWNING],
  [GAME_PHASES.SPAWNING]: [GAME_PHASES.BUYING]
};

/**
 * Simple state machine for game phase management
 */
export class GameStateMachine {
  constructor(initialPhase = GAME_PHASES.BUYING) {
    this.currentPhase = initialPhase;
    this.listeners = [];
  }

  /**
   * Transition to a new phase
   * @param {string} newPhase - The phase to transition to
   * @returns {boolean} True if transition was successful
   */
  transition(newPhase) {
    // Allow transitioning to the same phase (idempotent operation)
    if (this.currentPhase === newPhase) {
      return true;
    }

    if (!this.isValidTransition(newPhase)) {
      console.warn(
        `Invalid state transition: ${this.currentPhase} -> ${newPhase}. ` +
        `Valid transitions from ${this.currentPhase}: ${VALID_TRANSITIONS[this.currentPhase]?.join(', ') || 'none'}`
      );
      return false;
    }

    const oldPhase = this.currentPhase;
    this.currentPhase = newPhase;

    // Notify all listeners of the state change
    this.listeners.forEach(callback => callback(newPhase, oldPhase));

    return true;
  }

  /**
   * Check if a transition is valid
   * @param {string} newPhase - The phase to check
   * @returns {boolean} True if transition is allowed
   */
  isValidTransition(newPhase) {
    const allowedTransitions = VALID_TRANSITIONS[this.currentPhase];
    if (!allowedTransitions) return false;
    return allowedTransitions.includes(newPhase);
  }

  /**
   * Get current phase
   * @returns {string} Current game phase
   */
  getPhase() {
    return this.currentPhase;
  }

  /**
   * Check if in a specific phase
   * @param {string} phase - Phase to check
   * @returns {boolean} True if currently in that phase
   */
  isInPhase(phase) {
    return this.currentPhase === phase;
  }

  /**
   * Subscribe to phase changes
   * @param {Function} callback - Function to call on phase change (newPhase, oldPhase)
   * @returns {Function} Unsubscribe function
   */
  onChange(callback) {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Reset to initial phase
   * @param {string} phase - Phase to reset to
   */
  reset(phase = GAME_PHASES.BUYING) {
    this.currentPhase = phase;
    this.listeners = [];
  }
}

/**
 * Helper function to set up a scene with state machine
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {string} initialPhase - Initial game phase (default: BUYING)
 * @returns {GameStateMachine} The state machine instance
 */
export function setupGameStateMachine(scene, initialPhase = GAME_PHASES.BUYING) {
  const stateMachine = new GameStateMachine(initialPhase);
  scene.gameStateMachine = stateMachine;
  return stateMachine;
}

/**
 * Utility function to transition game phase on the scene
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {string} newPhase - The phase to transition to
 * @returns {boolean} True if transition was successful
 */
export function transitionGamePhase(scene, newPhase) {
  if (!scene.gameStateMachine) {
    console.error('Game state machine not initialized on scene');
    return false;
  }
  return scene.gameStateMachine.transition(newPhase);
}

/**
 * Get current game phase from scene
 * @param {Phaser.Scene} scene - The Phaser scene
 * @returns {string} Current game phase
 */
export function getCurrentGamePhase(scene) {
  if (!scene.gameStateMachine) {
    return scene.gamePhase; // Fallback to legacy gamePhase property
  }
  return scene.gameStateMachine.getPhase();
}

/**
 * Check if scene is in a specific phase
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {string} phase - Phase to check
 * @returns {boolean} True if in that phase
 */
export function isGamePhase(scene, phase) {
  if (!scene.gameStateMachine) {
    return scene.gamePhase === phase;
  }
  return scene.gameStateMachine.isInPhase(phase);
}
