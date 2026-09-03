/**
 * Vector Animation Engine Core
 */

export class VectorPoint {
  constructor(x, y, pressure = 1.0) {
    this.x = x;
    this.y = y;
    this.pressure = pressure;
  }

  static lerp(p1, p2, t) {
    return new VectorPoint(
      p1.x + (p2.x - p1.x) * t,
      p1.y + (p2.y - p1.y) * t,
      p1.pressure + (p2.pressure - p1.pressure) * t
    );
  }
}

export class VectorStroke {
  constructor(color = "#000000", width = 3) {
    this.points = [];
    this.color = color;
    this.width = width;
  }

  addPoint(x, y, pressure = 1.0) {
    this.points.push(new VectorPoint(x, y, pressure));
  }

  clone() {
    const copy = new VectorStroke(this.color, this.width);
    copy.points = this.points.map(p => new VectorPoint(p.x, p.y, p.pressure));
    return copy;
  }

  static interpolate(s1, s2, t) {
    const result = new VectorStroke(s1.color, s1.width + (s2.width - s1.width) * t);
    const count = Math.min(s1.points.length, s2.points.length);
    for (let i = 0; i < count; i++) {
      result.points.push(VectorPoint.lerp(s1.points[i], s2.points[i], t));
    }
    return result;
  }
}

export class Keyframe {
  constructor(frameIndex) {
    this.frameIndex = frameIndex;
    this.strokes = [];
  }

  addStroke(stroke) {
    this.strokes.push(stroke);
  }

  clone(newFrameIndex) {
    const kf = new Keyframe(newFrameIndex !== undefined ? newFrameIndex : this.frameIndex);
    kf.strokes = this.strokes.map(s => s.clone());
    return kf;
  }
}

export class Timeline {
  constructor(fps = 24, totalFrames = 120) {
    this.fps = fps;
    this.totalFrames = totalFrames;
    this.currentFrame = 0;
    this.keyframes = new Map(); // frameIndex -> Keyframe
    this.isPlaying = false;
    this.onionSkin = true;

    // Seed initial keyframe at frame 0
    this.setKeyframe(0, new Keyframe(0));
  }

  setKeyframe(frameIndex, keyframe) {
    this.keyframes.set(frameIndex, keyframe);
  }

  getKeyframe(frameIndex) {
    return this.keyframes.get(frameIndex);
  }

  hasKeyframe(frameIndex) {
    return this.keyframes.has(frameIndex);
  }

  getPrevKeyframe(frame) {
    const indices = Array.from(this.keyframes.keys()).sort((a, b) => a - b);
    let prev = null;
    for (let idx of indices) {
      if (idx <= frame) prev = this.keyframes.get(idx);
      else break;
    }
    return prev;
  }

  getNextKeyframe(frame) {
    const indices = Array.from(this.keyframes.keys()).sort((a, b) => a - b);
    for (let idx of indices) {
      if (idx > frame) return this.keyframes.get(idx);
    }
    return null;
  }

  // Linear / Morph interpolation between keyframes
  getActiveStrokes(frame) {
    if (this.keyframes.has(frame)) {
      return this.keyframes.get(frame).strokes;
    }

    const prev = this.getPrevKeyframe(frame);
    const next = this.getNextKeyframe(frame);

    if (prev && !next) return prev.strokes;
    if (!prev && next) return next.strokes;
    if (!prev && !next) return [];

    const t = (frame - prev.frameIndex) / (next.frameIndex - prev.frameIndex);
    const interpolated = [];
    const minCount = Math.min(prev.strokes.length, next.strokes.length);

    for (let i = 0; i < minCount; i++) {
      interpolated.push(VectorStroke.interpolate(prev.strokes[i], next.strokes[i], t));
    }
    return interpolated;
  }
}

export class VectorRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }

  renderStroke(stroke, alpha = 1.0) {
    if (stroke.points.length < 2) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 0; i < stroke.points.length - 1; i++) {
      const p1 = stroke.points[i];
      const p2 = stroke.points[i + 1];

      ctx.beginPath();
      ctx.lineWidth = stroke.width * (p1.pressure || 1.0);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderFrame(timeline, currentStroke = null) {
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    this.ctx.clearRect(0, 0, width, height);

    // Render Canvas background grid / artboard
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, width, height);

    // Onion Skinning (Previous frame in red, next frame in green)
    if (timeline.onionSkin && !timeline.isPlaying) {
      if (timeline.currentFrame > 0) {
        const prevStrokes = timeline.getActiveStrokes(timeline.currentFrame - 1);
        prevStrokes.forEach(s => {
          const ghost = s.clone();
          ghost.color = "#ff4444";
          this.renderStroke(ghost, 0.25);
        });
      }
      if (timeline.currentFrame < timeline.totalFrames - 1) {
        const nextStrokes = timeline.getActiveStrokes(timeline.currentFrame + 1);
        nextStrokes.forEach(s => {
          const ghost = s.clone();
          ghost.color = "#44bb44";
          this.renderStroke(ghost, 0.25);
        });
      }
    }

    // Render active frame strokes
    const strokes = timeline.getActiveStrokes(timeline.currentFrame);
    strokes.forEach(s => this.renderStroke(s));

    // Render live active drawing stroke
    if (currentStroke) {
      this.renderStroke(currentStroke);
    }
  }
}
