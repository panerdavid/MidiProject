/**
 * DREAMY MIDI OCEAN - ORGANIZED STRUCTURE
 * Sections: Settings, State, p5.js Core, Logic, Visual Modules, Classes
 */



// --- CLASSES ---
class NoteArray {
  constructor() {
    this.activeNotes = new Set()
    this.noteVelocities = {}
    this.masterVelocity = 0
    this.chord = { current: "", last: "" }
  }

  add(note) {
    this.activeNotes.add(note.identifier);
    this.noteVelocities[note.identifier] = note.velocity;
    this.updateVelocity();
  }

  remove(note) {
    this.activeNotes.delete(note.identifier);
    delete this.noteVelocities[note.identifier];
    this.updateVelocity();
  }

  updateVelocity() {
    let notes = Object.values(this.noteVelocities);
    if (notes.length === 0) {
      this.masterVelocity = 0;
      return;
    }
    let sum = notes.reduce((acc, val) => acc + val, 0);
    this.masterVelocity = sum / notes.length;
  }
}
class Fish {
  constructor(x, col, vel) {
    this.x = x;
    this.y = (height + 50) * CONFIG.horizon;
    this.vx = random(-2, 2);
    this.vy = map(vel, 0, 1, -5, -20);
    this.color = col;
    this.alive = true;
    this.history = []; // Store past positions
  }

  update() {
    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > 10) this.history.shift();
    this.x += this.vx;
    this.y += this.vy;
    this.vy += CONFIG.gravity;
    this.vx *= 0.99;
    if (this.y > height * CONFIG.horizon + 20 && this.vy > 0) {
      this.alive = false;
      state.physics.splash += 1;
    }

  }

  draw() {
    push();
    translate(this.x, this.y);
    rotate(atan2(this.vy, this.vx));

    // Gen Z Palette: Use slightly de-saturated "clay" colors or high-contrast "toxic" neon
    // fill(red(this.color), green(this.color), blue(this.color), 230);
    noFill()
    strokeWeight(2);
    stroke(red(this.color), green(this.color), blue(this.color), 200);


    // Drawing an imperfect, "blobby" diamond/fish shape
    beginShape();
    for (let a = 0; a < TWO_PI; a += .2) {
      // Adding noise to the radius makes the shape "wiggle" as it flies
      let wobble = noise(frameCount * 0.2, a) * 5;
      let r = 12 + wobble;
      let x = cos(a) * r * 1.2; // Longer body
      let y = sin(a) * r * 0.3; // Thinner body
      vertex(x, y);
    }

    endShape(CLOSE);
    pop();
  }
}

// --- CONFIGURATION & SETTINGS ---
const CONFIG = {
  horizon: 0.5,
  waveSpeed: 0.007,
  gravity: 0.5,
  hazeAlpha: 80,
  lerpSpeed: .05,
  highNoteThreshold: 0 // C6
};

// --- GLOBAL STATE ---
let state = {
  pianoActiveNotes: new NoteArray(),
  padActiveNotes: new NoteArray(),
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
  fill(10, 10, 20, 200);
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

  state.physics.intensity = lerp(state.physics.intensity, state.padActiveNotes.activeNotes.size, CONFIG.lerpSpeed);
  state.physics.splash *= 0.95; // Natural decay
}

function updateMusicLogic() {
  let pianoNotes = Array.from(state.pianoActiveNotes.activeNotes);
  let synthNotes = Array.from(state.padActiveNotes.activeNotes)
  let detected = Tonal.Chord.detect(synthNotes);

  //Chord Color Change Logic
  if (detected.length > 0) {
    let newChord = detected[0];
    if (newChord !== state.padActiveNotes.chord.last) {
      state.physics.splash = 10;
      state.padActiveNotes.chord.last = newChord;
    }
    state.padActiveNotes.chord.current = newChord;

    // Update Target Colors
    let details = Tonal.Chord.get(newChord);
    if (details.quality === "Major") state.colors.target = [255, 180, 50];
    else if (details.quality === "Minor") state.colors.target = [50, 120, 255];
    else state.colors.target = [180, 100, 255];
  } else {
    state.padActiveNotes.chord.current = "";
    state.padActiveNotes.chord.last = "";
    state.colors.target = [20, 20, 30];
  }

  // Count High Notes
  state.physics.highNotes = pianoNotes.filter(id => Tonal.Note.get(id).midi >= CONFIG.highNoteThreshold).length;
}

// --- 5. VISUAL MODULES (Isolated with push/pop) ---
function renderOcean() {
  push();
  let horizon = height * CONFIG.horizon;
  let ebb = map(sin(frameCount * 0.01), -1, 1, 0.8, 5);

  noFill();
  drawingContext.shadowBlur = 10;
  drawingContext.shadowColor = state.colors.display;

  for (let i = 0; i < 15; i++) { // More lines for a denser look
    // 1. Perspective Math
    let progress = i / 15;
    let yBase = lerp(horizon, height, Math.pow(progress, 2));

    // 2. Fading and Thickness
    let alpha = map(i, 0, 15, 30, 180);
    let weight = map(i, 0, 15, 0.5, 4);

    let waveColor = color(red(state.colors.display), green(state.colors.display), blue(state.colors.display), alpha);
    stroke(waveColor);
    noFill();

    strokeWeight(weight);

    beginShape();
    // Smaller step (15) makes the lines "silky" instead of "pixelated"
    for (let x = 0; x <= width + 20; x += 15) {

      // 3. Multi-layered Noise
      let bigSwell = noise(x * 0.004, i * 0.1, frameCount * CONFIG.waveSpeed);
      let smallChop = noise(x * 0.015, i, frameCount * CONFIG.waveSpeed * 2.5);

      let waveMath = (bigSwell * 0.7) + (smallChop * 0.3);
      // Pinch the crests
      waveMath = Math.pow(waveMath, 1.2);

      let waveHeight = (map(state.physics.intensity, 0, 10, 10, 50) + state.physics.splash) * ebb;
      let speedScale = map(i, 0, 12, 0.2, 1.0);
      let waveBackgroundSpeed = noise(x * 0.005, i, frameCount * CONFIG.waveSpeed * speedScale)
      let yOffset = waveMath * waveHeight * (progress + 0.5) * waveBackgroundSpeed; // Foreground waves are taller and move faster


      vertex(x, yBase + (yOffset - waveHeight / 2));

      
    }
    endShape();
  }
  pop();
}
function renderFishes() {
  push();
  for (let i = state.objects.fishes.length - 1; i >= 0; i--) {
    let f = state.objects.fishes[i];
    if (frameCount % 2 === 0) {
      f.update();
    }
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
  textFont("Courier New");
  textStyle(BOLD);
  textSize(32);
  text(state.padActiveNotes.chord.current, 40, height - 40);
  pop();
}



// --- 7. MIDI & UTILS ---
function initMIDI() {
  WebMidi.enable().then(() => {
    if (WebMidi.inputs.length < 1) return;
    const piano = WebMidi.inputs[0];
    const pad = WebMidi.inputs[1];

    const handleEvent = (noteArray, e, isAdd) => {
      if (isAdd) noteArray.add(e.note);
      else noteArray.remove(e.note);
      updateMusicLogic();
    };

    piano.addListener("noteon", e => {
      handleEvent(state.pianoActiveNotes, e, true);
      if (e.note.number >= CONFIG.highNoteThreshold) {
        // Make sure 'state.colors.display' is actually a p5 color object
        console.log(e.note.attack)
        state.objects.fishes.push(new Fish(
          map(e.note.number, 60, 100, width * 0.2, width * 0.8),
          state.colors.display,
          e.note.attack
        ));
      }
    });

    piano.addListener("noteoff", e => {
      handleEvent(state.pianoActiveNotes, e, false);
    });
    pad.addListener("noteon", e => {
      handleEvent(state.padActiveNotes, e, true);
    });

    pad.addListener("noteoff", e => {
      handleEvent(state.padActiveNotes, e, false);
    });
  });


}



function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}