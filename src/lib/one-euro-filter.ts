// 1€ Filter implementation for jitter removal and low-latency smoothing
// Based on: https://cristal.univ-lille.fr/~casiez/1euro/

class LowPassFilter {
  lastValue: number;
  alpha: number;

  constructor(alpha: number) {
    this.alpha = alpha;
    this.lastValue = 0;
  }

  filter(value: number, alpha?: number): number {
    if (alpha !== undefined) {
      this.alpha = alpha;
    }
    this.lastValue = this.alpha * value + (1.0 - this.alpha) * this.lastValue;
    return this.lastValue;
  }
}

export class OneEuroFilter {
  private freq: number;
  private mincutoff: number;
  private beta: number;
  private dcutoff: number;
  private x: LowPassFilter;
  private dx: LowPassFilter;
  private lastTime: number | null;

  constructor(freq: number, mincutoff: number = 1.0, beta: number = 0.0, dcutoff: number = 1.0) {
    this.freq = freq;
    this.mincutoff = mincutoff;
    this.beta = beta;
    this.dcutoff = dcutoff;
    this.x = new LowPassFilter(this.alpha(mincutoff));
    this.dx = new LowPassFilter(this.alpha(dcutoff));
    this.lastTime = null;
  }

  private alpha(cutoff: number): number {
    const te = 1.0 / this.freq;
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / te);
  }

  filter(value: number, timestamp?: number): number {
    const now = timestamp !== undefined ? timestamp : performance.now();
    
    if (this.lastTime === null) {
      this.lastTime = now;
      this.x.lastValue = value;
      return value;
    }

    // Calculate time delta
    const dt = (now - this.lastTime) / 1000.0;
    if (dt <= 0) {
      return this.x.lastValue;
    }
    
    this.freq = 1.0 / dt;
    this.lastTime = now;

    // Calculate velocity (derivative)
    const dvalue = (value - this.x.lastValue) * this.freq;
    const edvalue = this.dx.filter(dvalue, this.alpha(this.dcutoff));

    // Adjust cutoff based on velocity
    const cutoff = this.mincutoff + this.beta * Math.abs(edvalue);

    // Final filtering
    return this.x.filter(value, this.alpha(cutoff));
  }

  reset(): void {
    this.lastTime = null;
    this.x.lastValue = 0;
    this.dx.lastValue = 0;
  }
}
