// Handles creation of spike projectiles for SpikeTower
export function addSpikeProjectile(scene, x, y, damage, fatSpikes = false) {
  // This function is now only used for legacy or direct placement. For flying spikes, see SpikeTower.js
  // (Kept for compatibility)
  const spike = scene.add.sprite(x, y, 'spike_projectile');
  spike.setDepth(2000);
  const size = fatSpikes ? 47 : 24;
  spike.setDisplaySize(size, size);
  if (fatSpikes) spike.setTint(0xff00ff);
  spike.damage = damage;
  spike.active = true;
  spike.hitRadius = size;
  spike._hasHit = new Set();
  if (fatSpikes) spike.remainingPops = 2;
  if (!scene.spikeProjectiles) scene.spikeProjectiles = [];
  scene.spikeProjectiles.push(spike);
  return spike;
}
