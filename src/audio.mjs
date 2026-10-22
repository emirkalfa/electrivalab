// Audio is unlocked by the simulation Start gesture; the circuit controls its output.
export class LabAudio {
  constructor(createContext = () => new AudioContext()) { this.createContext = createContext; this.enabled = false; }
  async enable() {
    if (!this.context || this.context.state === 'closed') {
      this.context = this.createContext();
      this.gain = this.context.createGain();
      this.gain.gain.value = 0;
      this.oscillator = this.context.createOscillator();
      this.oscillator.type = 'square';
      this.oscillator.connect(this.gain);
      this.gain.connect(this.context.destination);
      this.oscillator.start();
    }
    await this.context.resume();
    if (this.context.state !== 'running') { this.enabled = false; throw Error('Ses çıkışı başlatılamadı (' + this.context.state + ').'); }
    this.enabled = true;
  }
  output(frequency, active) {
    if (!this.context) return;
    const on = this.enabled && active && this.context.state === 'running';
    if (on) this.oscillator.frequency.setValueAtTime(Math.min(3000, Math.max(100, frequency)), this.context.currentTime);
    this.gain.gain.setTargetAtTime(on ? .10 : 0, this.context.currentTime, .015);
  }
  mute() { this.output(660, false); }
  disable() { this.enabled = false; this.mute(); }
}
