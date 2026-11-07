# Otter Run: Otter Model Brief
**Brief v0.1 · 7 November 2026**  
*For a 3D artist (a commission, an adapted licensed model, or your own work in Blender)*

---

## 1. Summary
One stylized low-poly otter, rigged and animated, to replace the capsule placeholder in a 3D browser racing game (three.js with React Three Fiber). The same model is recolored in code for three rival otters.

**Deliver**: A single `.glb` file and the `.blend` source.  
**Key need**: The otter must read clearly at speed. The game camera sits about 7 m behind and 3.5 m above the otter, so most of the time the player sees its back, ears and tail.

---

## 2. Style
- **Stylized and cel-shaded**: Bright, saturated, soft rounded shapes. Inspiration is the general look of stylized anime-adjacent mascots. Nothing may be copied from existing characters or games.
- **Proportions**: Round body, short limbs, thick tail, small round ears, short snout, large friendly eyes. An otter, simplified.
- **A characterful shape from behind**: Clear ears, tail and back silhouette, because that is the view the player sees most.
- **Expression**: Friendly and determined.
- **Palette** (current placeholder colors, which can be refined):
  - Fur: `#8d5b34`
  - Belly, chest and muzzle: `#d8c5a4`
  - Ears and tail: `#734524`
  - Nose: `#1a1410`
  - Eyes: near black with a small white highlight
- **No outline geometry**: The dark outline is drawn in code by rendering a slightly enlarged copy of the mesh with only its back faces showing. For that to look right: closed (watertight) meshes, smooth normals, no flat-shaded facets, and no tiny separate parts floating near the surface.

---

## 3. Technical Requirements

| Item | Requirement |
| :--- | :--- |
| **Format** | glTF 2.0 binary (`.glb`), Y up, the otter faces +Z (the glTF front) |
| **Scale** | 1 unit = 1 meter. Body about 1.6 m long, about 2.2 m nose to tail tip, about 0.7 m tall |
| **Origin** | At the waterline, mid-body, centered left to right. The waterline sits about halfway up the belly |
| **Triangles** | Player model at most 4,000. Optional lower detail version at most 1,200 for rivals |
| **Meshes & Materials** | At most 3 meshes and 5 materials in total |
| **Material Names (exact)** | `otter_fur`, `otter_belly`, `otter_accent`, `otter_eyes`, `otter_scarf` |
| **Textures** | None needed. Flat colors, plus optional vertex colors. If unavoidable, one 512×512 atlas. No normal, roughness or metallic maps: the game uses a toon material and reads color only |
| **Rig** | One armature, at most 25 bones, at most 4 weights per vertex, English bone names |
| **Animation** | 30 fps, in place (no root motion), loops must be seamless |
| **Cleanliness** | Transforms applied, no negative scale, no unapplied modifiers, no hidden objects, no cameras or lights in the file |
| **File size** | At most 500 KB for the `.glb` |
| **Originality** | Original work only. Say in writing if any part is bought, scanned or AI-assisted |

---

## 4. Animations (Exact Names)

### Required
| Name | Type | Length | Description |
| :--- | :--- | :--- | :--- |
| `idle_float` | Loop | 2.0 s | Gentle bob on the water, tail sway, ear twitch |
| `swim_cruise` | Loop | 0.8 s | Steady paddling, a wave through the spine, tail sway |
| `swim_fast` | Loop | 0.5 s | Stretched and streamlined, limbs tucked, quick tail |
| `dash` | One-shot | 0.5 s | Crouch, then stretch into a streamlined pose and hold it |
| `hit` | One-shot | 0.4 s | Recoil and wobble after hitting a rock, ending near the swim_cruise pose |
| `celebrate` | One-shot | 1.5 s | A happy pop and spin with the arms up |

### Optional
| Name | Type | Length | Description |
| :--- | :--- | :--- | :--- |
| `lean_left`, `lean_right` | Single-frame | 1 frame | Body lean into a turn |
| `disappointed` | One-shot | 1.5 s | A slump for last place |

> The game already adds a little roll, bobbing and squash and stretch in code. Keep the animations in place and subtle so they blend well with those effects.

---

## 5. Variants
- **Rivals**: Pip (blue), Barnaby (green) and Luna (rose) use the same model. The code replaces the colors of `otter_fur` and `otter_scarf`, so keep those two materials separate and do not bake shading into vertex colors on those meshes. Rival sizes (Pip smaller, Barnaby larger) are scaled in code. No extra modeling is needed.
- **Optional extra, quoted separately**: Elder Moss, an older otter NPC with a scarf and a fishing rod, with a calm idle animation, at most 3,000 triangles, in the same style and under the same technical rules.

---

## 6. Deliverables, Process and Acceptance

### Deliverables
- `otter.glb`
- Optional lower detail version (a mesh named `otter_lod1` or a second file)
- The `.blend` source file
- A turnaround image (front, side and back)
- A written rights statement

### Process (Approve each stage before the next)
1. Turnaround sketches
2. A flat-colored block-out, checked from the game camera angle (behind and above)
3. The final model with the rig
4. Animations
5. Revisions

### Acceptance Checklist
- [ ] Opens in a glTF viewer (e.g. three.js editor) facing $+Z$, with no stretching
- [ ] Triangle count within limits ($\le 4,000$ player / $\le 1,200$ rival LOD)
- [ ] Materials and animations have the exact names specified, and loops are seamless
- [ ] Scale (1 unit = 1 meter) and origin (waterline, mid-body) are correct
- [ ] File size $\le 500\text{ KB}$
- [ ] Test render from 7 m behind and 3.5 m above shows a clear, readable silhouette

---

## 7. Notes for the Commissioner
- **Fixed price**: Ask for a fixed price for the model, rig, and required animations, a separate price for optional items, how many revision rounds are included, and a delivery date.
- **Rights**: Get written confirmation of full commercial rights, the right to modify the model, and no revenue share.
- **Buying a ready-made model**: Confirm commercial use and modification license. You will likely still need to rename materials, rig, and animate it.
- **Where to look**: ArtStation, Sketchfab store, Fiverr, Upwork, itch.io.
- **Doing it in Blender**: Block out the shape, refine it, rig it, animate it, then export as glTF binary with $+Y$ up and modifiers applied.
- **Screenshots**: Send the artist screenshots of the game (the capsule otter on the river), not the code.

---

## 8. Ready-to-Send Message to an Artist
```text
Hi, I’m looking for a stylized low-poly otter for a 3D browser game built with three.js. The look is cel-shaded with round friendly shapes and big eyes, and it needs to read well from behind and above. I need one .glb with a rig (at most 25 bones), at most 4,000 triangles, flat-color materials with specific names, and six in-place animations: idle_float, swim_cruise, swim_fast, dash, hit and celebrate. The full brief is attached. Could you give me a fixed price, a delivery estimate, and confirm full commercial rights? I would like to approve turnaround sketches before you model.
```

---

## 9. Unknowns
- Whether an artist can hit 4,000 triangles in this style (ask for a block-out first).
- Triangle budget depends on target devices. Current race scenes measure ~40 to 51 draw calls and 28,000 to 32,000 triangles, so each rival otter should add at most 3 draw calls.
- Price and timeline (request estimates per candidate).
