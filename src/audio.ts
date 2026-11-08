export class FlightAudio {
  private context?: AudioContext;
  volume = 0.12;

  start() {
    try {
      this.context ||= new AudioContext();
      void this.context.resume().catch(() => {});
    } catch { /* The mission remains fully playable without audio. */ }
  }

  tone(kind: 'shot' | 'hit' | 'missile' | 'warning' | 'complete' | 'focus') {
    const context = this.context;
    if (!context || context.state !== 'running' || this.volume === 0) return;
    const frequencies = { shot: 180, hit: 70, missile: 400, warning: 780, complete: 660, focus: 330 };
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const duration = kind === 'shot' ? 0.06 : kind === 'complete' ? 0.8 : 0.2;
    oscillator.type = kind === 'hit' || kind === 'shot' ? 'sawtooth' : 'sine';
    oscillator.frequency.setValueAtTime(frequencies[kind], context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(35, frequencies[kind] * (kind === 'complete' ? 2 : 0.4)), context.currentTime + duration);
    gain.gain.setValueAtTime(this.volume * (kind === 'shot' ? 0.2 : 0.5), context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
}
