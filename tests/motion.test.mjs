import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { bindWorkDrag, centerProject, startIntro, createVideoLoop } from '../assets/portfolio-motion.js';

class Target {
  listeners = new Map();
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(callback);
  }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  emit(type, properties = {}) {
    const event = { target: this, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, isPrimary: true, clientY: 0,
      preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...properties };
    for (const callback of this.listeners.get(type) || []) callback(event);
    return event;
  }
}
const classes = () => {
  const values = new Set();
  return { add: value => values.add(value), remove: value => values.delete(value), contains: value => values.has(value) };
};
function environment(t) {
  const old = { window: globalThis.window, document: globalThis.document, requestAnimationFrame: globalThis.requestAnimationFrame, cancelAnimationFrame: globalThis.cancelAnimationFrame };
  const frames = new Map();
  let id = 0;
  globalThis.window = new Target();
  globalThis.document = { body: { classList: classes() } };
  globalThis.requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  t.after(() => { for (const [name,value] of Object.entries(old)) { if (value === undefined) delete globalThis[name]; else globalThis[name] = value; } });
  return { frame(time) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time)); } };
}
function makeTrack() {
  const track = new Target();
  Object.assign(track, { scrollLeft: 0, scrollWidth: 1500, clientWidth: 500, classList: classes(), captured: false,
    getBoundingClientRect: () => ({ left: 0, width: 500 }),
    scrollTo({ left, behavior }) { this.scrollLeft = left; this.lastBehavior = behavior; },
    setPointerCapture() { this.captured = true; }, hasPointerCapture() { return this.captured; }, releasePointerCapture() { this.captured = false; } });
  const cards = ['01','02','03'].map((id, index) => ({ dataset: { project: id }, getBoundingClientRect: () => ({ left: index * 500 - track.scrollLeft, width: 500 }) }));
  track.querySelectorAll = () => cards;
  track.querySelector = selector => cards.find(card => selector.includes(card.dataset.project));
  return track;
}

test('drag updates the current project and does not recenter on release', t => {
  environment(t);
  const track = makeTrack();
  let selected = '01';
  const dispose = bindWorkDrag(track, { onSelect: id => { selected = id; }, onStep: () => {} });
  track.emit('pointerdown', { clientX: 600 });
  window.emit('pointermove', { clientX: 597 });
  assert.equal(track.scrollLeft, 0);
  window.emit('pointermove', { clientX: 70 });
  window.emit('pointerup', { buttons: 0 });
  assert.equal(track.scrollLeft, 530);
  assert.equal(selected, '02');
  assert.equal(track.captured, false);
  const click = track.emit('click', { detail: 1 });
  assert.equal(click.prevented, true);
  assert.equal(click.stopped, true);
  dispose();
  assert.equal([...window.listeners.values()].reduce((sum, set) => sum + set.size, 0), 0);
});

test('native touch scrolling synchronizes selection without blocking vertical gestures', async t => {
  environment(t);
  const track = makeTrack();
  let selected;
  const dispose = bindWorkDrag(track, { onSelect: id => { selected = id; }, onStep: () => {} });
  const down = track.emit('pointerdown', { pointerType: 'touch', clientX: 500 });
  assert.equal(down.prevented, undefined);
  track.scrollLeft = 900;
  track.emit('scroll');
  await delay(180);
  assert.equal(selected, '03');
  dispose();
});

test('vertical mouse motion is not hijacked as a horizontal drag', t => {
  environment(t);
  const track = makeTrack();
  const dispose = bindWorkDrag(track, { onSelect: () => {}, onStep: () => {} });
  track.emit('pointerdown', { clientX: 100 });
  const move = window.emit('pointermove', { clientX: 90, clientY: 50 });
  assert.equal(track.scrollLeft, 0);
  assert.equal(move.prevented, undefined);
  dispose();
});

test('arrow centering honors bounds and reduced motion', () => {
  const track = makeTrack();
  centerProject(track, '02');
  assert.equal(track.scrollLeft, 500);
  assert.equal(track.lastBehavior, 'smooth');
  centerProject(track, '03', true);
  assert.equal(track.scrollLeft, 1000);
  assert.equal(track.lastBehavior, 'instant');
});

test('keyboard arrow control preserves button keyboard behavior', t => {
  environment(t);
  const track = makeTrack();
  const steps = [];
  const dispose = bindWorkDrag(track, { onSelect: () => {}, onStep: step => steps.push(step) });
  track.emit('keydown', { key: 'ArrowRight' });
  track.emit('keydown', { key: 'ArrowLeft', target: {} });
  assert.deepEqual(steps, [1]);
  dispose();
});

test('intro waits for readiness, shares one reveal progress and completes from the final animation', async t => {
  const env = environment(t);
  const root = new Target();
  const properties = new Map();
  root.style = { setProperty: (key,value) => properties.set(key,value) };
  let resolveAssets;
  const assetsReady = new Promise(resolve => { resolveAssets = resolve; });
  const phases = [];
  const dispose = startIntro(root, { assetsReady, reducedMotion: false, onPhase: phase => phases.push(phase) });
  await delay(670);
  assert.deepEqual(phases, ['loading']);
  resolveAssets();
  await Promise.resolve(); await Promise.resolve();
  env.frame(0); env.frame(450);
  assert.equal(Number(properties.get('--entry-progress')), .5);
  env.frame(900);
  assert.deepEqual(phases, ['loading','revealing','revealed']);
  root.emit('animationend', { animationName: 'entryActionsIn' });
  assert.equal(phases.at(-1), 'complete');
  assert.equal(document.body.classList.contains('intro-running'), false);
  dispose();
});

test('reduced motion enters the page immediately', t => {
  environment(t);
  const root = new Target();
  const properties = new Map();
  root.style = { setProperty: (key,value) => properties.set(key,value) };
  const phases = [];
  const dispose = startIntro(root, { assetsReady: new Promise(() => {}), reducedMotion: true, onPhase: phase => phases.push(phase) });
  assert.deepEqual(phases, ['complete']);
  assert.equal(properties.get('--entry-progress'), '1');
  dispose();
});

class Video extends Target {
  paused = true;
  currentTime = 0;
  duration = 15;
  readyState = 2;
  callbacks = new Map();
  nextCallback = 0;
  rejectPlay = false;
  pause() { this.paused = true; }
  play() { if (this.rejectPlay) return Promise.reject(new Error('autoplay denied')); this.paused = false; return Promise.resolve(); }
  requestVideoFrameCallback(callback) { this.callbacks.set(++this.nextCallback, callback); return this.nextCallback; }
  cancelVideoFrameCallback(id) { this.callbacks.delete(id); }
  frame() { const callbacks = [...this.callbacks.values()]; this.callbacks.clear(); callbacks.forEach(callback => callback()); }
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

test('outgoing video plays until the next frame exists and the crossfade ends', async () => {
  const videos = [new Video(),new Video()];
  const active = [];
  const loop = createVideoLoop(videos, { onActive: id => active.push(id), fadeMs: 15 });
  try {
    await loop.ready;
    videos[0].currentTime = 14.4; videos[0].emit('timeupdate');
    await flush();
    assert.deepEqual(active, []);
    assert.equal(videos[0].paused, false);
    videos[1].frame(); await flush();
    assert.deepEqual(active, [1]);
    assert.equal(videos[0].paused, false);
    await delay(25);
    assert.equal(videos[0].paused, true);
    assert.equal(videos[1].paused, false);
  } finally { loop.dispose(); }
});

test('autoplay failure keeps the outgoing native loop visible', async () => {
  const videos = [new Video(),new Video()];
  videos[1].rejectPlay = true;
  const active = [];
  const loop = createVideoLoop(videos, { onActive: id => active.push(id) });
  try {
    videos[0].currentTime = 14.4; videos[0].emit('timeupdate'); await flush();
    assert.deepEqual(active, []);
    assert.equal(videos[0].paused, false);
    assert.equal(videos[0].loop, true);
  } finally { loop.dispose(); }
});

test('three consecutive loop handoffs alternate videos without activating an undecoded frame', async () => {
  const videos = [new Video(),new Video()];
  const active = [];
  const loop = createVideoLoop(videos, { onActive: id => active.push(id), fadeMs: 5 });
  try {
    let current = 0;
    for (let iteration = 0; iteration < 3; iteration++) {
      videos[current].currentTime = 14.4;
      videos[current].emit('timeupdate');
      await flush();
      assert.equal(active.length, iteration);
      const next = 1 - current;
      videos[next].frame(); await flush(); await delay(10);
      assert.equal(videos[current].paused, true);
      assert.equal(videos[next].paused, false);
      current = next;
    }
    assert.deepEqual(active, [1,0,1]);
  } finally { loop.dispose(); }
});

test('missing media readiness times out so the poster can reveal', async () => {
  const videos = [new Video(),new Video()]; videos[0].readyState = 0;
  const loop = createVideoLoop(videos, { onActive: () => {}, readyTimeoutMs: 10 });
  try { await loop.ready; assert.equal(videos[0].loop, true); } finally { loop.dispose(); }
});

test('suspending a pending handoff prevents stale activation and resumes the current video', async () => {
  const videos = [new Video(),new Video()];
  const active = [];
  const loop = createVideoLoop(videos, { onActive: id => active.push(id) });
  try {
    videos[0].currentTime = 14.4; videos[0].emit('timeupdate'); await flush();
    loop.suspend(true); await flush();
    assert.equal(videos[0].paused, true); assert.equal(videos[1].paused, true);
    assert.equal(videos[1].callbacks.size, 0);
    assert.deepEqual(active, []);
    loop.suspend(false); await flush();
    assert.equal(videos[0].paused, false);
    assert.equal(videos[1].paused, true);
  } finally { loop.dispose(); }
});

test('reduced motion keeps both background videos paused', async () => {
  const videos = [new Video(),new Video()];
  const loop = createVideoLoop(videos, { onActive: () => {}, reducedMotion: true });
  try {
    await loop.ready; loop.suspend(false);
    assert.equal(videos[0].paused, true); assert.equal(videos[1].paused, true);
  } finally { loop.dispose(); }
});
