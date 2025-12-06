// main.js — Node entry point for the Baloune Tower Defense game

import { Baloune } from "../game/Baloune.js";

// When we add networking later:
// import { initSocketServer } from "./socket.js";

// Create an instance of the game
const game = new Baloune();

// Start the game
console.log("Starting Baloune Tower Defense...");
game.start();

if (typeof game.spawnWave === "function") {
    game.spawnWave([
    { type: "red", speed: 50, delay: 4.5 },
    { type: "red", speed: 70, delay: 0.5 },
    { type: "cherry", speed: 60, delay: 1.0 },
    { type: "red", speed: 80, delay: 0.3 }
   ); ]
}
// For testing — simple loop simulating updates
// (Phaser will later handle this part)
let tick = 0;
const interval = setInterval(() => {
    game.update(1 / 60); // simulate one frame at 60 FPS
    tick++;
    // Example debug output (remove later)
    if (tick % 60 === 0) {
        console.log(`Tick: ${tick}, Active enemies: ${game.enemies?.length || 0}`);
    }

    // Stop after 5 seconds (just for testing)
    if (tick > 300) {
        console.log("Test complete. Stopping game loop.");
        clearInterval(interval);
    }
}, 1000 / 60);
