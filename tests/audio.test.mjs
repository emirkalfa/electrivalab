import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LabAudio } from '../src/audio.mjs';
function fakeContext(resumeWorks = true) {
  const calls = [];
  const param = name => Object.fromEntries(['setValueAtTime', 'setTargetAtTime', 'linearRampToValueAtTime', 'cancelScheduledValues'].map(method => [method, (...args) => calls.push([name, method, ...args])]));
  const context = { state: 'suspended', currentTime: 1, destination: {}, createGain: () => ({ gain: param('gain'), connect() {} }), createOscillator: () => ({ frequency: param('frequency'), connect() {}, start() {} }), async resume() { if (resumeWorks) this.state = 'running'; } };
  return { context, calls };
}
test('buzzer sends audible waveform only when enabled and active', async () => {
  const {context,calls}=fakeContext();const audio=new LabAudio(()=>context);
  await audio.enable();audio.output(660,true);
  assert.equal(audio.oscillator.type,'square');
  assert.ok(calls.some(c=>c[0]==='frequency'&&c[2]===660));
  assert.ok(calls.some(c=>c[0]==='gain'&&c[1]==='setTargetAtTime'&&c[2]===.10));
  audio.disable();assert.equal(calls.at(-1)[2],0);
});
test('suspended audio is reported as failure, not success', async()=>{const {context}=fakeContext(false);const audio=new LabAudio(()=>context);await assert.rejects(audio.enable(),/başlatılamadı/);assert.equal(audio.enabled,false);});

test('powered circuit drives audio and pause or disconnected supply silences it',async()=>{const {createPart}=await import('../src/catalog.mjs');const {createSimulation}=await import('../src/engine.mjs');const battery=createPart('battery'),buzzer=createPart('buzzer');const p={version:1,name:'Buzzer',parts:[battery,buzzer],wires:[{id:'plus',from:{part:battery.id,pin:'+'},to:{part:buzzer.id,pin:'+'}},{id:'minus',from:{part:battery.id,pin:'-'},to:{part:buzzer.id,pin:'-'}}],code:'void loop(){delay(100);}'};const {context,calls}=fakeContext(),audio=new LabAudio(()=>context);await audio.enable();let result=createSimulation(p).step(p);assert.equal(result.measures[buzzer.id].on,true);audio.output(buzzer.params.frequency,result.measures[buzzer.id].on);assert.equal(calls.at(-1)[2],.10);audio.mute();assert.equal(calls.at(-1)[2],0);p.wires.pop();result=createSimulation(p).step(p);assert.equal(result.measures[buzzer.id].on,false);audio.output(buzzer.params.frequency,result.measures[buzzer.id].on);assert.equal(calls.at(-1)[2],0);});
