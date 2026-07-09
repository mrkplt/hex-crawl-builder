# Hex Crawl Builder — Drag & Drop Manual Test Cases

Run each case in the browser at the running app. After each case, note the
**step number** where reality diverged from the "Expected" text, and describe
what you actually saw. Be literal — "the hex jumped down and left by about its
own width" is far more useful than "it broke."

Terminology used consistently below:

- **Home position** — the exact spot on the canvas where a hex sits when nothing
  is being dragged.
- **Drag ghost** — a semi-transparent (roughly 50% opacity) copy of the hex that
  should follow the pointer while a drag is in progress.
- **Source hex** — the actual hex node living on the canvas that you started
  dragging from.
- **Snap back** — the source hex returning to its exact original home position,
  with full (100%) opacity, no drift in any direction.
- **Trash zone** — the "🗑 Trash" control in the top toolbar.
- **Palette tile** — the "New hex" hexagon in the top-left of the toolbar.

---

## Preconditions (do this once before Case 1)

1. Open the app and open the browser DevTools console (you'll paste one line to
   guarantee a known starting state).
2. Paste this into the console and press Enter:
   ```
   localStorage.setItem('hex-crawl-builder:campaign', JSON.stringify({version:1,template:{fields:[{id:'f1',label:'Name',type:'short_text',required:true,order:0}]},hexes:[{id:'hex-a',coordinate:{q:0,r:0},neighbors:[null,'hex-b',null,null,null,null],fieldValues:{},createdAt:1},{id:'hex-b',coordinate:{q:1,r:0},neighbors:[null,null,null,null,'hex-a',null],fieldValues:{},createdAt:2}]}));
   ```
3. Reload the page.
4. **Expected:** You land directly on the map screen (not the onboarding /
   "Create Template" screen). You see **two hexagons touching side by side** near
   the middle of the canvas, both showing an orange "!" marker. Top toolbar shows
   the "New hex" palette tile (left), the "🗑 Trash" zone (center-ish), and a
   small "v0.x.x" version label (right).
5. Note the version label text and report it — this confirms which build is
   actually being tested.

---

## Case 1 — Drag a hex to the trash, then CANCEL (the primary reported defect)

This is the case that's been failing. Maximum detail wanted here.

1. Press and hold the left mouse button on the **left hex** (hex-a). Do not
   release yet.
2. Begin moving the pointer slowly toward the Trash zone in the toolbar, still
   holding.
3. **Expected during drag:** A **drag ghost** (semi-transparent, ~50% opacity
   copy of the hex) appears and follows your pointer as you move.
   - Report: Is there a ghost following the pointer at all? If yes, does it look
     like a hexagon, and is it roughly centered under the pointer or offset to
     one side/corner? If no ghost, what (if anything) moves?
4. **Expected during drag:** The **source hex** back on the canvas should either
   stay put at its home position, or dim slightly — but it should NOT teleport,
   jump, or fly off.
   - Report: What does the original hex on the canvas do the moment you start
     dragging? Does it stay, dim, disappear, or jump somewhere?
5. **Expected during drag:** The Trash zone should visually react as you drag
   over it (it becomes more prominent — larger, red-tinted, thicker border).
   - Report: Does the Trash zone change appearance when your pointer is over it?
6. Move the pointer fully over the Trash zone and **release** the mouse button.
7. **Expected on release:** A modal dialog titled **"Delete hex?"** appears, with
   body text about removing the hex, and two buttons: **Cancel** and **Delete**.
   The canvas dims behind the modal.
   - Report: Does the dialog appear? Where is the source hex at this moment — can
     you see it behind the dim, and is it in its home position or somewhere else?
8. **Expected on release:** The drag ghost should be gone (a drag can't be "in
   progress" once you've released and a dialog is up).
   - Report: Is there any leftover semi-transparent hex stuck under/near the
     pointer while the dialog is open?
9. Click **Cancel**.
10. **Expected after Cancel:** The dialog closes. **Both hexes are present**, side
    by side, touching, both at 100% opacity. The hex you dragged (hex-a) is back
    at its **exact original home position** — the two-hex layout looks
    pixel-for-pixel identical to Preconditions step 4.
    - Report precisely: After clicking Cancel, how many hexes do you see? Where is
      hex-a relative to hex-b — still touching on the left, or displaced (and if
      displaced, in which direction and roughly how far — half a hex? a full hex?
      off screen)? Is either hex faded/semi-transparent, or both fully solid?
11. **Expected follow-up:** Confirm the app is still usable. Try to click the left
    hex once.
    - Report: Does clicking it open an edit panel/focus view, or does nothing
      happen (i.e., is the canvas "stuck")?

---

## Case 2 — Drag a hex to the trash, then DELETE (confirm path)

1. Reload the page (to restore the clean two-hex fixture from Preconditions).
2. Press and hold on the **right hex** (hex-b), drag it over the Trash zone, and
   release.
3. **Expected:** The "Delete hex?" dialog appears (same as Case 1).
4. Click **Delete**.
5. **Expected after Delete:** The dialog closes. Only **one hex remains** (the
   left hex, hex-a), at its home position, full opacity. No leftover ghost, no
   displaced phantom.
   - Report: How many hexes remain and where? Any visual leftovers?

---

## Case 3 — Drag a hex to a VALID adjacent empty cell (a legal move)

1. Reload the page (clean two-hex fixture).
2. Press and hold on the **right hex** (hex-b).
3. Drag it to the empty space **directly below-right of the left hex** (hex-a) —
   i.e., aim for the cell that shares hex-a's lower-right edge (the "SE" neighbor
   cell). Release there.
4. **Expected during drag:** A ghost follows the pointer; the Trash zone does NOT
   activate (you're over the canvas, not the trash).
5. **Expected on release:** The hex **settles into the target cell**, snapping to
   a clean hex-grid position so that it shares a full edge with hex-a (no partial
   overlap, no gap). Both hexes remain at full opacity. No dialog appears (moves
   don't confirm).
   - Report: Did the hex move to a new cell? Does it sit flush against hex-a
     sharing a clean edge, or is it overlapping/floating/misaligned? Any leftover
     ghost?

---

## Case 4 — Drag a hex to an ILLEGAL cell (non-adjacent), expect snap-back

1. Reload the page (clean two-hex fixture).
2. Press and hold on the **right hex** (hex-b).
3. Drag it **far away** to an empty part of the canvas that is NOT touching any
   hex (e.g., toward the far right or far bottom of the visible canvas, several
   hex-widths away from hex-a). Release there.
4. **Expected during drag:** A ghost follows the pointer.
5. **Expected on release:** Because the drop cell isn't adjacent to any other hex
   (illegal — hexes must stay contiguous), the move is **rejected**. The hex
   **snaps back** to its original home position next to hex-a, full opacity.
   Briefly, the canvas may flash a rejection indicator (a colored outline). No hex
   is left floating at the drop point.
   - Report: After release, where is the hex? Did it return to its home spot next
     to hex-a, stay at the far drop point, or land somewhere else? Was there any
     flash/outline? Any duplicate or phantom hex left behind?

---

## Case 5 — Drag a hex onto an OCCUPIED cell, expect snap-back

1. Reload the page (clean two-hex fixture).
2. Press and hold on the **left hex** (hex-a).
3. Drag it directly **on top of the right hex** (hex-b) — aim for hex-b's center.
   Release.
4. **Expected on release:** The move is **rejected** (that cell is occupied).
   hex-a **snaps back** to its home position on the left. You end with the same
   clean two-hex side-by-side layout, both full opacity, no overlap, no phantom.
   - Report: Where does hex-a end up? Do you end with two clean hexes as before,
     or is there overlap/displacement/a leftover?

---

## Case 6 — Place a NEW hex from the palette (the separate HTML5-drag path)

1. Reload the page (clean two-hex fixture).
2. Press and hold on the **"New hex" palette tile** in the top-left of the
   toolbar.
3. **Expected during drag:** A hexagon-shaped drag ghost follows the pointer.
   - Report: Is the ghost a hexagon, and is it centered under the pointer?
4. Drag onto an empty cell that is **adjacent to** one of the existing hexes
   (touching an edge) and release.
5. **Expected on release:** A **new hexagon appears** in that cell, flush against
   the neighbor, full opacity, with a "!" marker. Now three hexes total.
   - Report: Did a new hex appear where you dropped it? Flush with a neighbor or
     misaligned? Total hex count now?
6. Now repeat: drag the palette tile onto an empty cell **far from any hex** (not
   touching anything) and release.
7. **Expected:** **Nothing is placed** (new hexes must be contiguous after the
   first). Possibly a brief rejection flash. Hex count unchanged.
   - Report: Did a hex get placed in the isolated spot (wrong) or was it correctly
     refused?

---

## What to send back

For each case, the fastest useful format is:

- **Case N: passed** — or —
- **Case N: failed at step X** — then the literal description of what happened,
  especially: *did a drag ghost appear and follow the pointer?*, *where did the
  source hex go during and after the drag?*, and *what opacity was everything?*

The ghost behavior in steps 3/4 of Case 1 is the single most diagnostic thing —
if there's no semi-transparent ghost following the pointer, or if the source hex
itself flies around during the drag, that points to React Flow's drag rendering
being the problem, not the snap-back logic, and it changes the entire fix.
