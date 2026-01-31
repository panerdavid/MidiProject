## 🚀 How to Run

### Option 1: Electron
This method provides a dedicated, high-performance window for the experience.

1.  **Install Dependencies:** Ensure you have [Node.js](https://nodejs.org/) installed.
2.  **Launch the App:** Open your terminal in the project folder and run:
    ```bash
    npm install
    npm start
    ```

---

### Option 2: Live Server
Use this if you just want to run it in your browser.

1.  **Open in VS Code.**
2.  **Launch Live Server:** Click the **"Go Live"** button in the bottom right corner of VS Code (requires the *Live Server* extension).
3.  **MIDI Permissions:** When prompted by your browser, ensure you click **"Allow"** for MIDI device access.

---

## 🎹 MIDI Configuration

> [!IMPORTANT]
> I am currently working on a more robust setup. For now, the app assigns functionality based on the order of recognition:

* **First MIDI Device:** Controls the waves.
* **Second MIDI Device:** Triggers the sprites that bounce around.

**Tip:** If your devices aren't connected in the right order, simply unplug and replug the connections in the specific order you want them detected.
