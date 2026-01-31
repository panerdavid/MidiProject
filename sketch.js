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
  constructor(x, col, vel, isSmall = false) {
    this.x = x;
    this.y = (height + 50) * CONFIG.horizon;
    this.vx = random(-2, 2);
    this.vy = map(vel, 0, 1, -5, -20);
    this.color = col;
    this.isSmall = isSmall
    this.alive = true;
    this.angle = 45;
    this.history = []; 
  }

  update() {
    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > 10) this.history.shift();
    this.x += this.vx;
    this.y += this.vy;
    this.vy += CONFIG.gravity * 2;
    this.vx *= 0.99;
    if (this.y > height * CONFIG.horizon + 20 && this.vy > 0) {
      this.alive = false;
      state.physics.splash += 1;
    }

  }


  draw() {
    push();
    translate(this.x, this.y);


    noStroke();
    fill(red(this.color), green(this.color), blue(this.color), 200);

    let p = this.isSmall ? 3 : 6; // pixel size

    //PIXELATED "SOOT" BLOB
    const sprite = [
      [0, 1, 1, 1, 0],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0]
    ];

    for (let row = 0; row < sprite.length; row++) {
      for (let col = 0; col < sprite[row].length; col++) {
        if (sprite[row][col] === 1) {
          // Offset each pixel to center the sprite
          let posX = (col - 2) * p;
          let posY = (row - 2) * p;

          // Add tiny bit of "jitter" to make them feel alive
          let jitterX = noise(frameCount * 0.2, this.x) * 2;
          rect(posX + jitterX, posY, p, p);
        }
      }
    }

    // add eyes
    fill(255, 255, 255, 50);
    rect(-p, -p, p, p); 
    rect(p, -p, p, p); 

    pop();
  }
}
class Star {
  constructor() {
    this.x = random(windowWidth);
    this.y = random(windowHeight * CONFIG.horizon - 40); 
    this.size = random(1, 3);
    this.offset = random(TWO_PI); // Random start point for twinkling
    this.speed = random(0.02, 0.05);
  }

  draw() {
    let twinkle = map(sin(frameCount * this.speed + this.offset), -1, 1, 30, 200);
    noStroke();

    push();
    translate(this.x, this.y);

    // 1. Star core 
    fill(255, 255, 255, twinkle);
    rect(0, 0, 2, 2);


    // 2. The "Fuzz" (Dimmer pixels in a cross pattern)
    // This simulates the glow/bleeding of a CRT monitor
    fill(255, 255, 255, twinkle * 0.4);
    rect(-2, 0, 2, 2); // Left
    rect(2, 0, 2, 2);  // Right
    rect(0, -2, 2, 2); // Top
    rect(0, 2, 2, 2);  // Bottom

    pop();
  }
}

// --- CONFIGURATION & SETTINGS ---
const CONFIG = {
  horizon: 0.5,
  waveSpeed: 0.007,
  gravity: 0.7,
  hazeAlpha: 80,
  //color lerp, change to affect speed of color transitions
  lerpSpeed: .05,
};

// --- GLOBAL STATE ---
let state = {
  pianoActiveNotes: new NoteArray(),
  padActiveNotes: new NoteArray(),
  colors: { target: [20, 20, 30], display: null },
  physics: { intensity: 0, splash: 0 },
  objects: { fishes: [], stars: [] }
};

// --- 3. P5.JS CORE ---

function setup() {
  createCanvas(windowWidth, windowHeight);
  state.colors.display = color(20, 20, 30);
  for (let i = 0; i < 100; i++) {
    state.objects.stars.push(new Star());
  }
  initMIDI();
  blendMode(ADD);


}

function draw() {
  updateGlobalPhysics();
  // Sky Background (using BLEND to clear the frame)
  blendMode(BLEND);
  fill(45, 27, 78, 200);
  rect(0, 0, width, height);

  for (let s of state.objects.stars) {
    s.draw();
  }
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
  let synthNotes = Array.from(state.padActiveNotes.activeNotes);
  let detected = Tonal.Chord.detect(synthNotes);
  let chord = getBetterChord(detected, synthNotes)
  //Chord Color Change Logic
  if (detected.length > 0) {
    let newChord = chord;
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

}

// --- 5. VISUAL MODULES (Isolated with push/pop) ---
function renderOcean() {
  push();
  let horizon = height * CONFIG.horizon;
  let ebb = map(sin(frameCount * 0.005), -1, 1, 0.8, 1.8);


  for (let i = 0; i < 15; i++) {
    let progress = i / 15;
    let yBase = lerp(horizon, height, Math.pow(progress, 2));
    let alphaVal = map(i, 0, 15, 20, 120);

    // STACKED FILL: Gives the water volume and "weight"
    fill(red(state.colors.display), green(state.colors.display), blue(state.colors.display), 12);

    // PERSPECTIVE WEIGHT: Thicker lines in the front
    strokeWeight(map(i, 0, 15, 1, 3.5));

    beginShape();
    // Start at bottom to close the fill properly
    vertex(0, height);

    for (let x = 0; x <= width + 30; x += 5) {
      // Multi-layered Noise for movement
      let bigSwell = noise(x * 0.003, i * 0.1, frameCount * CONFIG.waveSpeed);
      let smallChop = noise(x * 0.012, i, frameCount * CONFIG.waveSpeed * 3);
      let waveMath = Math.pow((bigSwell * 0.7) + (smallChop * 0.3), 1.2);

      let waveHeight = (map(state.physics.intensity, 0, 10, 30, 130) + state.physics.splash) * ebb;
      let yOffset = waveMath * waveHeight * (progress + 0.6);
      let currentY = yBase + (yOffset - waveHeight / 2);

      // thicken waves
      stroke(255, 0, 0, 10);
      vertex(x - 40, currentY);

      // draw the main wave color at the actual x position
      // (Note: This stroke will apply to the line segment being created)
      stroke(red(state.colors.display), green(state.colors.display), blue(state.colors.display), alphaVal);
      vertex(x, currentY);

      // SHIMMER LOGIC: Highlights the peaks of the waves
      let peakHighlight = map(waveMath, 0.6, 1.0, 0, 255, true);
      if (peakHighlight > 10) {
        stroke(255, 255, 255, peakHighlight * (alphaVal / 255));
      } else {
        stroke(red(state.colors.display), green(state.colors.display), blue(state.colors.display), alphaVal);
      }

      vertex(x, currentY);

      // DUST logic
      let dustNoise = noise(x * 0.1, i, frameCount * 0.01);


      if (dustNoise > 0.68) {
        push();
        // noise for position drift effect 

        let driftX = noise(frameCount * 0.02, x) * 40 - 20;
        let driftY = noise(frameCount * 0.02, i) * 30;

        strokeWeight(random(1, 3));
        stroke(255, alphaVal * 0.4);
        point(x + driftX, currentY + driftY);
        pop();
      }


    }

    vertex(width, height); // Close back to bottom right
    endShape(CLOSE);
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
  textFont(" 'Press Start 2P' ");
  textStyle(BOLD);
  textAlign(CENTER, CENTER); 
  textSize(32);
  text(state.padActiveNotes.chord.current, width / 2, height / 2);
  drawScanlines()
  pop();
}



// --- 7. MIDI & UTILS ---
function initMIDI() {
  WebMidi.enable().then(() => {
    if (WebMidi.inputs.length < 1) return;
    const piano = WebMidi.inputs[1];
    const pad = WebMidi.inputs[0];

    const handleEvent = (noteArray, e, isAdd) => {
      if (isAdd) noteArray.add(e.note);
      else noteArray.remove(e.note);
      updateMusicLogic();
    };

    piano.addListener("noteon", e => {
      handleEvent(state.pianoActiveNotes, e, true);


      if (e.note.accidental == "#") {

        state.objects.fishes.push(new Fish(
          map(e.note.number, 60, 100, width * 0.2, width * 0.8),
          state.colors.display,
          e.note.attack,
          true
        ));
      }
      else {
        state.objects.fishes.push(new Fish(
          map(e.note.number, 60, 100, width * 0.2, width * 0.8),
          state.colors.display,
          e.note.attack,
          false
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

// CRT SCANLINE EFFECT
function drawScanlines() {
  push();
  stroke(0, 0, 0, 40); 
  strokeWeight(1);
  
  // horizontal line every 3 pixels
  for (let i = 0; i < height; i += 3) {
    line(0, i, width, i);
  }
  pop();
}

// HACKY FIX FOR IMPROVING TONAL.JS CHORD RECOGNITION 
function getBetterChord(chordList, rawNotes) {
  if (rawNotes.length < 3) return "";

  // Sort notes by pitch to find bass note
  let sortedNotes = rawNotes.sort((a, b) => Tonal.Midi.toMidi(a) - Tonal.Midi.toMidi(b));
  

  let root = Tonal.Note.pitchClass(sortedNotes[0]);

  // Find the first tonal.js detection that starts with the root note
  let bestFit = chordList.find(d => d.startsWith(root));

  // If no root match, just take first detection
  return bestFit || chordList[0] || "";
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  state.objects.stars = [];
  for (let i = 0; i < 100; i++) {
    state.objects.stars.push(new Star());
  }
}