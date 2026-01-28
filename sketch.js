/**
 * DREAMY MIDI OCEAN - ORGANIZED STRUCTURE
 * Sections: Settings, State, p5.js Core, Logic, Visual Modules, Classes
 */

// --- 1. CONFIGURATION & SETTINGS ---
const CONFIG = {
  horizon: 0.5,
  waveSpeed: 0.02,
  gravity: 0.5,
  hazeAlpha: 80,
  lerpSpeed: 1,
  highNoteThreshold: 0 // C6
};

// --- 2. GLOBAL STATE ---
let state = {
  pianoActiveNotes: new NoteArray(),
  padActiveNotes: new NoteArray(),
  noteVelocities: {}, // Stores the velocity of each individual key
  masterVelocity: 0,   // The singular variable for your waves
  chord: { current: "", last: "" },
  colors: { target: [20, 20, 30], display: null },
  physics: { intensity: 0, splash: 0, highNotes: 0 },
  objects: { fishes: [] }
};

// --- 3. P5.JS CORE ---
function setup() {
  createCanvas(windowWidth, windowHeight);
  state.colors.display = color(20, 20, 30);
  initMIDI();
  blendMode(ADD);
}

function draw() {
  updateGlobalPhysics();

  // Sky Background (using BLEND to clear the frame)
  blendMode(BLEND);
  fill(10, 10, 20, 30);
  rect(0, 0, width, height);
  blendMode(ADD);

  // Render Layers
  renderFishes();
  renderOcean();
  renderUI();
}

// --- 4. LOGIC & PHYSICS ENGINE ---
function updateGlobalPhysics() {
  // Smoothly transition colors and intensity
  let target = color(...state.colors.target);
  state.colors.display = lerpColor(state.colors.display, target, CONFIG.lerpSpeed);

  state.physics.intensity = lerp(state.physics.intensity, state.padActiveNotes.size, CONFIG.lerpSpeed);
  state.physics.splash *= 0.95; // Natural decay
}

function updateMusicLogic() {
  let pianoNotes = Array.from(state.pianoActiveNotes);
  let synthNotes = Array.from(state.padActiveNotes)
  let detected = Tonal.Chord.detect(synthNotes);

  if (detected.length > 0) {
    let newChord = detected[0];
    if (newChord !== state.chord.last) {
      state.physics.splash = 80;
      state.chord.last = newChord;
    }
    state.chord.current = newChord;

    // Update Target Colors
    let details = Tonal.Chord.get(newChord);
    if (details.quality === "Major") state.colors.target = [255, 180, 50];
    else if (details.quality === "Minor") state.colors.target = [50, 120, 255];
    else state.colors.target = [180, 100, 255];
  } else {
    state.chord.current = "";
    state.chord.last = "";
    state.colors.target = [20, 20, 30];
  }

  // Count High Notes
  state.physics.highNotes = pianoNotes.filter(id => Tonal.Note.get(id).midi >= CONFIG.highNoteThreshold).length;
}

// --- 5. VISUAL MODULES (Isolated with push/pop) ---
function renderOcean() {
  push();
  let ebb = map(sin(frameCount * 0.01), -1, 1, 0.9, 5.0);

  let horizon = height * CONFIG.horizon;
  let baseWaveHeight = map(state.physics.intensity, 0, 10, 5, 25);
  let totalWaveHeight = (baseWaveHeight + state.physics.splash) * ebb;

  noFill();
  drawingContext.shadowBlur = 15;
  drawingContext.shadowColor = state.colors.display;

  for (let i = 0; i < 12; i++) {
    let yBase = map(i * i, 0, 144, horizon, height);
    let alpha = map(i, 0, 12, 40, 150);
    stroke(red(state.colors.display), green(state.colors.display), blue(state.colors.display), alpha);

    beginShape();
    for (let x = 0; x <= width; x += 40) {

      let yOffset = noise(x * 0.005, i, frameCount * CONFIG.waveSpeed) * totalWaveHeight;
      vertex(x, yBase + yOffset);
    }
    endShape();
  }
  pop();
}

function renderFishes() {
  push();
  for (let i = state.objects.fishes.length - 1; i >= 0; i--) {
    let f = state.objects.fishes[i];
    f.update();
    f.draw();
    if (!f.alive) state.objects.fishes.splice(i, 1);
  }
  pop();
}

function renderUI() {
  push();
  blendMode(BLEND);
  noStroke();
  fill(255, 150);
  textSize(24);
  text(state.chord.current, 40, height - 40);
  pop();
}

// --- 6. CLASSES ---

class NoteArray {
  constructor() {
    this.activeNotes = new Set()
    this.noteVelocities = {}
    this.masterVelocity = 0
    this.chord = { current: "", last: "" }
  }
}
class Fish {
  constructor(x, col) {
    this.x = x;
    this.y = height * CONFIG.horizon;
    this.vx = random(-2, 2);
    this.vy = random(-12, -18);
    this.color = col;
    this.alive = true;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += CONFIG.gravity;
    if (this.y > height * CONFIG.horizon + 20 && this.vy > 0) {
      this.alive = false;
      state.physics.splash += 5;
    }
  }

  draw() {
    fill(red(this.color), green(this.color), blue(this.color), 200);
    push();
    translate(this.x, this.y);
    rotate(atan2(this.vy, this.vx));
    ellipse(0, 0, 15, 7);
    pop();
  }
}

// --- 7. MIDI & UTILS ---
function initMIDI() {
  WebMidi.enable().then(() => {
    if (WebMidi.inputs.length < 1) return;
    const piano = WebMidi.inputs[0];
    const pad = WebMidi.inputs[1];

    piano.addListener("noteon", e => {
      state.pianoActiveNotes.add(e.note.identifier);
      if (e.note.number >= CONFIG.highNoteThreshold) {
        state.objects.fishes.push(new Fish(map(e.note.number, 84, 108, width * 0.2, width * 0.8), state.colors.display));
      }
      updateMusicLogic();
    });

    piano.addListener("noteoff", e => {
      state.pianoActiveNotes.delete(e.note.identifier);
      updateMusicLogic();
    });
    pad.addListener("noteon", e => {
      state.padActiveNotes.add(e.note.identifier);
      updateMusicLogic();
    });

    pad.addListener("noteoff", e => {
      state.padActiveNotes.delete(e.note.identifier);
      updateMusicLogic();
    });
  });


}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}