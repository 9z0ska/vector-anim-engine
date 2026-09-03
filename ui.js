/**
 * UI Builder (Strictly HTML and JavaScript - No CSS files, no <style> tags)
 */

export class UIManager {
  constructor(rootElement, onAction) {
    this.root = rootElement;
    this.onAction = onAction;
    this.timelineScrubber = null;
    this.frameDisplay = null;
    this.canvas = null;

    this.initLayout();
  }

  initLayout() {
    // Top-level Application Layout Container
    this.container = document.createElement("div");
    Object.assign(this.container.style, {
      display: "flex",
      flexDirection: "column",
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
      backgroundColor: "#1e1e1e",
      fontFamily: "system-ui, -apple-system, sans-serif",
      userSelect: "none",
      touchAction: "none"
    });
    this.root.appendChild(this.container);

    this.createToolbar();
    this.createViewport();
    this.createTimelineUI();
  }

  createToolbar() {
    const toolbar = document.createElement("div");
    Object.assign(toolbar.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 12px",
      backgroundColor: "#2a2a2a",
      borderBottom: "1px solid #3a3a3a",
      color: "#ffffff"
    });

    const createBtn = (label, action) => {
      const btn = document.createElement("button");
      btn.innerText = label;
      Object.assign(btn.style, {
        padding: "8px 14px",
        backgroundColor: "#3a3a3a",
        color: "#ffffff",
        border: "1px solid #555555",
        borderRadius: "4px",
        fontSize: "14px",
        cursor: "pointer"
      });
      btn.addEventListener("click", () => this.onAction(action));
      toolbar.appendChild(btn);
      return btn;
    };

    this.playBtn = createBtn("▶ Play", "togglePlay");
    createBtn("+ Keyframe", "addKeyframe");
    createBtn("Clear Frame", "clearFrame");
    createBtn("Toggle Onion", "toggleOnion");

    // Stroke width slider (Touch & Pen friendly)
    const strokeLabel = document.createElement("label");
    strokeLabel.innerText = "Size:";
    strokeLabel.style.marginLeft = "12px";
    toolbar.appendChild(strokeLabel);

    const strokeInput = document.createElement("input");
    strokeInput.type = "range";
    strokeInput.min = "1";
    strokeInput.max = "30";
    strokeInput.value = "4";
    strokeInput.style.cursor = "pointer";
    strokeInput.addEventListener("input", (e) => {
      this.onAction("strokeWidth", parseFloat(e.target.value));
    });
    toolbar.appendChild(strokeInput);

    // Color picker
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = "#000000";
    colorInput.style.cursor = "pointer";
    colorInput.addEventListener("input", (e) => {
      this.onAction("strokeColor", e.target.value);
    });
    toolbar.appendChild(colorInput);

    this.container.appendChild(toolbar);
  }

  createViewport() {
    const viewport = document.createElement("div");
    Object.assign(viewport.style, {
      flex: "1",
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#121212",
      overflow: "hidden"
    });

    this.canvas = document.createElement("canvas");
    Object.assign(this.canvas.style, {
      width: "90%",
      height: "90%",
      backgroundColor: "#ffffff",
      boxShadow: "0 0 20px rgba(0,0,0,0.5)",
      touchAction: "none" // Crucial for stylus/pen drawing without gesture conflicts
    });

    viewport.appendChild(this.canvas);
    this.container.appendChild(viewport);
  }

  createTimelineUI() {
    const timelinePanel = document.createElement("div");
    Object.assign(timelinePanel.style, {
      height: "70px",
      backgroundColor: "#2a2a2a",
      borderTop: "1px solid #3a3a3a",
      display: "flex",
      flexDirection: "column",
      padding: "6px 12px",
      gap: "6px"
    });

    const infoRow = document.createElement("div");
    Object.assign(infoRow.style, {
      display: "flex",
      justifyContent: "space-between",
      color: "#bbbbbb",
      fontSize: "12px"
    });

    this.frameDisplay = document.createElement("span");
    this.frameDisplay.innerText = "Frame: 0 / 120";
    infoRow.appendChild(this.frameDisplay);

    this.keyframeStatus = document.createElement("span");
    this.keyframeStatus.innerText = "Keyframe: Active";
    infoRow.appendChild(this.keyframeStatus);

    timelinePanel.appendChild(infoRow);

    // Scrubber
    this.timelineScrubber = document.createElement("input");
    this.timelineScrubber.type = "range";
    this.timelineScrubber.min = "0";
    this.timelineScrubber.max = "120";
    this.timelineScrubber.value = "0";
    Object.assign(this.timelineScrubber.style, {
      width: "100%",
      cursor: "pointer"
    });

    this.timelineScrubber.addEventListener("input", (e) => {
      this.onAction("seekFrame", parseInt(e.target.value, 10));
    });

    timelinePanel.appendChild(this.timelineScrubber);
    this.container.appendChild(timelinePanel);
  }

  updateFrameUI(currentFrame, totalFrames, isKeyframe) {
    if (this.timelineScrubber) this.timelineScrubber.value = currentFrame;
    if (this.frameDisplay) this.frameDisplay.innerText = `Frame: ${currentFrame} / ${totalFrames}`;
    if (this.keyframeStatus) {
      this.keyframeStatus.innerText = isKeyframe ? "● Keyframe" : "○ In-between (Interpolated)";
      this.keyframeStatus.style.color = isKeyframe ? "#4CAF50" : "#aaaaaa";
    }
  }

  setPlayingState(isPlaying) {
    this.playBtn.innerText = isPlaying ? "⏸ Pause" : "▶ Play";
  }
}
