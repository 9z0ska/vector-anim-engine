/**
 * Main Application Coordinator
 */

import { VectorStroke, Keyframe, Timeline, VectorRenderer } from "./engine.js";
import { UIManager } from "./ui.js";

class VectorApp {
  constructor() {
    this.root = document.getElementById("app-root");
    this.currentColor = "#000000";
    this.currentWidth = 4;
    this.isDrawing = false;
    this.currentStroke = null;

    this.timeline = new Timeline(24, 120);

    // Initialize UI
    this.ui = new UIManager(this.root, (action, payload) => this.handleAction(action, payload));
    
    // Initialize Vector Renderer
    this.renderer = new VectorRenderer(this.ui.canvas);

    // Setup High-Precision Pointer Listeners for Touch/Stylus/Mouse
    this.setupPointers();

    // Start Main Render & Animation Loop
    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));

    window.addEventListener("resize", () => {
      this.renderer.resize();
      this.renderer.renderFrame(this.timeline, this.currentStroke);
    });
  }

  setupPointers() {
    const canvas = this.ui.canvas;

    const getCanvasPoint = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Stylus pressure defaults to 0.5 or 1.0 when not supported
      const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 1.0;
      return { x, y, pressure };
    };

    canvas.addEventListener("pointerdown", (e) => {
      if (this.timeline.isPlaying) return;
      canvas.setPointerCapture(e.pointerId);
      this.isDrawing = true;

      const pt = getCanvasPoint(e);
      this.currentStroke = new VectorStroke(this.currentColor, this.currentWidth);
      this.currentStroke.addPoint(pt.x, pt.y, pt.pressure);
      this.renderer.renderFrame(this.timeline, this.currentStroke);
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!this.isDrawing || !this.currentStroke) return;
      const pt = getCanvasPoint(e);
      this.currentStroke.addPoint(pt.x, pt.y, pt.pressure);
      this.renderer.renderFrame(this.timeline, this.currentStroke);
    });

    const finishStroke = (e) => {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Safe capture handling across devices
      }

      if (this.currentStroke && this.currentStroke.points.length > 1) {
        // Auto-create keyframe if frame is empty
        if (!this.timeline.hasKeyframe(this.timeline.currentFrame)) {
          this.timeline.setKeyframe(this.timeline.currentFrame, new Keyframe(this.timeline.currentFrame));
        }
        this.timeline.getKeyframe(this.timeline.currentFrame).addStroke(this.currentStroke);
      }
      this.currentStroke = null;
      this.updateState();
    };

    canvas.addEventListener("pointerup", finishStroke);
    canvas.addEventListener("pointercancel", finishStroke);
  }

  handleAction(action, payload) {
    switch (action) {
      case "togglePlay":
        this.timeline.isPlaying = !this.timeline.isPlaying;
        this.ui.setPlayingState(this.timeline.isPlaying);
        break;

      case "seekFrame":
        this.timeline.currentFrame = payload;
        this.updateState();
        break;

      case "addKeyframe":
        const currentStrokes = this.timeline.getActiveStrokes(this.timeline.currentFrame);
        const kf = new Keyframe(this.timeline.currentFrame);
        kf.strokes = currentStrokes.map(s => s.clone());
        this.timeline.setKeyframe(this.timeline.currentFrame, kf);
        this.updateState();
        break;

      case "clearFrame":
        if (this.timeline.hasKeyframe(this.timeline.currentFrame)) {
          this.timeline.setKeyframe(this.timeline.currentFrame, new Keyframe(this.timeline.currentFrame));
          this.updateState();
        }
        break;

      case "toggleOnion":
        this.timeline.onionSkin = !this.timeline.onionSkin;
        this.renderer.renderFrame(this.timeline);
        break;

      case "strokeWidth":
        this.currentWidth = payload;
        break;

      case "strokeColor":
        this.currentColor = payload;
        break;
    }
  }

  updateState() {
    const isKf = this.timeline.hasKeyframe(this.timeline.currentFrame);
    this.ui.updateFrameUI(this.timeline.currentFrame, this.timeline.totalFrames, isKf);
    this.renderer.renderFrame(this.timeline, this.currentStroke);
  }

  loop(timestamp) {
    if (this.timeline.isPlaying) {
      const interval = 1000 / this.timeline.fps;
      const delta = timestamp - this.lastFrameTime;

      if (delta >= interval) {
        this.timeline.currentFrame = (this.timeline.currentFrame + 1) % this.timeline.totalFrames;
        this.lastFrameTime = timestamp - (delta % interval);
        this.updateState();
      }
    }
    requestAnimationFrame((t) => this.loop(t));
  }
}

// Bootstrap on DOM ready
window.addEventListener("DOMContentLoaded", () => {
  new VectorApp();
});
