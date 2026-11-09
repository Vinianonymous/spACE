export class FlightAudio {
  private context?: AudioContext;
  volume = 0.12;

  start() {
    try {
      this.context ||= new AudioContext();
      void this.context.resume().catch(() => {});
    } catch { /* The mission remains fully playable without audio. */ }
  }

  tone(kind: 'shot' | 'hit' | 'missile' | 'warning' | 'complete' | 'focus' | 'emp' | 'teleport' | 'overclock') {
    const context = this.context;
    if (!context || context.state !== 'running' || this.volume === 0) return;
    const frequencies = { shot: 180, hit: 70, missile: 400, warning: 780, complete: 660, focus: 330, emp: 560, teleport: 980, overclock: 240 };
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const duration = kind === 'shot' ? 0.06 : kind === 'complete' ? 0.8 : kind === 'emp' ? 0.45 : kind === 'overclock' ? 0.55 : 0.2;
    oscillator.type = kind === 'hit' || kind === 'shot' ? 'sawtooth' : kind === 'emp' || kind === 'overclock' ? 'square' : 'sine';
    oscillator.frequency.setValueAtTime(frequencies[kind], context.currentTime);
    const endFrequency = kind === 'emp' ? frequencies[kind] * 0.2 : kind === 'teleport' ? frequencies[kind] * 1.8 : Math.max(35, frequencies[kind] * (kind === 'complete' ? 2 : 0.4));
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, context.currentTime + duration);
    gain.gain.setValueAtTime(this.volume * (kind === 'shot' ? 0.2 : kind === 'emp' ? 0.6 : 0.5), context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
}
