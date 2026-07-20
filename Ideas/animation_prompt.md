# Dungeon Crawler Animation Overhaul Prompt

Please perform a massive visual and animation overhaul on my HTML5 Canvas `DungeonEngine` game. The goal is to maximize "game feel" and juiciness by adding 24 distinct animation features. Please implement the following upgrades by modifying `gameLoop()`, `render()`, and the relevant action/combat logic, ensuring performance is maintained using the `requestAnimationFrame` loop.

## 1. Movement & Idle Animations
1. **Walking Bob:** Modify `visualX` and `visualY` interpolation so entities perform a slight vertical sine-wave "hop" when moving between tiles.
2. **Idle Breathing:** When entities are stationary, apply a very slow, subtle vertical scale stretch/squish to simulate breathing.
3. **Item Hovering:** Items resting on the ground should gently float up and down to draw the player's eye.
4. **Footstep Dust:** Spawn tiny, fading dust particles at the entity's previous tile location when they move.

## 2. Combat & Impact Polish
5. **Attack Swipes:** Render a quick, glowing swipe/arc effect in the direction of melee attacks for a few frames.
6. **Hit Flashes:** Entities should briefly flash solid white when taking damage.
7. **Micro-Knockback:** Apply a temporary visual offset in the opposite direction of an incoming attack to simulate physical impact.
8. **Hit-Stop (Freeze Frame):** On critical hits or killing blows, pause the game's update loop for ~50ms to add massive weight to the strike.
9. **Screen Shake:** Trigger a brief, intense camera shake during heavy attacks, crits, or when opening chests.
10. **Death Explosions:** Instead of instantly vanishing, dying enemies enter a state where they shrink, fade out, and burst into a massive cloud of particles.
11. **Telegraph Pulses:** Enemy attack telegraph zones (red squares) should pulse in opacity, with a border that shrinks inward to visually count down to the strike.

## 3. Advanced VFX & Particles
12. **Physics Particles:** Upgrade the particle system to support gravity, floor-bouncing, and friction.
13. **Hit Splatters:** Emit bursts of physics-based particles on hits (red for organic, sparks for metallic/magical).
14. **Destructible Shards:** When breaking crates or pots, spawn wooden/ceramic splinter particles that bounce outward.
15. **Loot Bursts:** Items dropping from enemies or chests should pop upwards in an arc before landing.
16. **Projectile Trails:** Arrows and spells should leave a fading, translucent trail of smaller particles behind them.
17. **Casting Windup:** Before magical attacks, draw energy particles that suck inward toward the caster.
18. **Loot Sparkles:** High-rarity items on the ground should periodically emit a glinting "sparkle" particle.
19. **Status Effect Visuals:** Stunned enemies should have circling stars above them, and poisoned enemies should drip green particles.

## 4. Environment & Lighting
20. **Ambient Atmosphere:** Render slow-drifting mist layers or floating dust motes above the floor but below the lighting overlay.
21. **Level Transition Wipes:** When descending stairs, implement a circular "iris wipe" or pixel-dissolve effect that transitions the screen to black before loading the next floor.

## 5. UI & Feedback
22. **Ghost Health Bars:** When an entity loses HP, leave a white/yellow "ghost" bar that slowly drains down to the new health value after a brief delay.
23. **Dynamic Floating Text:** Damage numbers should pop up large, scale down, and have a slight random horizontal velocity instead of drifting straight up.
24. **Cinematic Level Up:** When the player levels up, display a large screen-centered "LEVEL UP!" text that zooms in, pauses, and shatters into glowing particles.

Please provide the updated code blocks for the particle system, the renderer, and the game loop to support these features!
