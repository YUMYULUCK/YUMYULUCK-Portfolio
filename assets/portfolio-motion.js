// Browser-native motion controllers. No extra animation or carousel dependency.
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function closestProject(track) {
  const bounds = track.getBoundingClientRect();
  const center = bounds.left + bounds.width / 2;
  return [...track.querySelectorAll('[data-project]')].reduce((best, card) => {
    const rect = card.getBoundingClientRect();
    const distance = Math.abs(rect.left + rect.width / 2 - center);
    return !best || distance < best.distance ? { card, distance } : best;
  }, null)?.card.dataset.project;
}

export function centerProject(track, id, reducedMotion = false) {
  const card = track.querySelector(`[data-project="${id}"]`);
  if (!card) return;
  const bounds = track.getBoundingClientRect();
  const rect = card.getBoundingClientRect();
  const left = track.scrollLeft + rect.left + rect.width / 2 - bounds.left - bounds.width / 2;
  track.scrollTo({ left: clamp(left, 0, track.scrollWidth - track.clientWidth), behavior: reducedMotion ? 'instant' : 'smooth' });
}

export function bindWorkDrag(track, { onSelect, onStep }) {
  let gesture = null;
  let suppressClick = false;
  let settleTimer;
  const removers = [];
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    removers.push(() => target.removeEventListener(type, handler, options));
  };
  const settle = () => {
    clearTimeout(settleTimer);
    if (!gesture) {
      const id = closestProject(track);
      if (id) onSelect(id);
    }
  };
  const finish = () => {
    if (!gesture) return;
    const finished = gesture;
    gesture = null;
    suppressClick = finished.dragging;
    track.classList.remove('is-dragging');
    if (track.hasPointerCapture(finished.id)) track.releasePointerCapture(finished.id);
    if (finished.dragging) settle();
  };

  listen(track, 'pointerdown', event => {
    if (event.button !== 0 || event.pointerType === 'touch' || event.isPrimary === false || gesture) return;
    clearTimeout(settleTimer);
    suppressClick = false;
    // Cancel an in-flight arrow scroll before measuring the new drag origin.
    track.scrollTo({ left: track.scrollLeft, behavior: 'instant' });
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, left: track.scrollLeft, dragging: false };
  });
  listen(window, 'pointermove', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    if (event.buttons === 0) { finish(); return; }
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.dragging) {
      if (Math.abs(dx) < 5) return;
      if (Math.abs(dy) > Math.abs(dx)) { gesture = null; return; }
      gesture.dragging = true;
      track.classList.add('is-dragging');
      track.setPointerCapture(gesture.id);
    }
    event.preventDefault();
    track.scrollLeft = clamp(gesture.left - dx, 0, track.scrollWidth - track.clientWidth);
  }, { passive: false });
  for (const type of ['pointerup', 'pointercancel']) {
    listen(window, type, event => { if (gesture?.id === event.pointerId) finish(); });
  }
  listen(window, 'blur', finish);
  listen(track, 'lostpointercapture', event => { if (gesture?.id === event.pointerId) finish(); });
  listen(track, 'dragstart', event => event.preventDefault());
  listen(track, 'click', event => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  listen(track, 'scroll', () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, 160);
  }, { passive: true });
  listen(track, 'keydown', event => {
    if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    onStep(event.key === 'ArrowLeft' ? -1 : 1);
  });
  return () => {
    finish();
    clearTimeout(settleTimer);
    removers.forEach(remove => remove());
  };
}

export function observeScene(root) {
  const hero = root.querySelector('.hero');
  const transition = root.querySelector('.hero-transition');
  const about = root.querySelector('.about');
  let frame = 0;
  const update = () => {
    frame = 0;
    const span = Math.max(1, transition.offsetHeight - hero.offsetHeight);
    const progress = clamp(-transition.getBoundingClientRect().top / span, 0, 1);
    root.style.setProperty('--hero-scroll', progress.toFixed(4));
    document.body.classList.toggle('is-scrolled', window.scrollY > 28);
    document.body.classList.toggle('is-light-nav', about.getBoundingClientRect().top < window.innerHeight * .68);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: .08, rootMargin: '0px 0px -5% 0px' });
  root.querySelectorAll('.reveal').forEach(element => observer.observe(element));
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();
  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
  };
}

export function startIntro(root, { assetsReady, reducedMotion, onPhase }) {
  let disposed = false;
  let frame = 0;
  let minimumTimer;
  let fallbackTimer;
  const finish = () => {
    if (disposed) return;
    clearTimeout(fallbackTimer);
    document.body.classList.remove('intro-running');
    onPhase('complete');
  };
  const animationEnd = event => {
    if (event.animationName === 'entryActionsIn') finish();
  };
  root.addEventListener('animationend', animationEnd);
  if (reducedMotion) {
    root.style.setProperty('--entry-progress', '1');
    finish();
  } else {
    document.body.classList.add('intro-running');
    onPhase('loading');
    const minimum = new Promise(resolve => { minimumTimer = setTimeout(resolve, 650); });
    Promise.all([assetsReady, minimum]).then(() => {
      if (disposed) return;
      onPhase('revealing');
      let start;
      const tick = time => {
        if (disposed) return;
        start ??= time;
        const progress = clamp((time - start) / 900, 0, 1);
        // One boundary drives both the loader withdrawal and the media reveal.
        const eased = progress * progress * (3 - 2 * progress);
        root.style.setProperty('--entry-progress', eased.toFixed(5));
        if (progress < 1) frame = requestAnimationFrame(tick);
        else {
          onPhase('revealed');
          // Safety only: the normal completion comes from the last animation.
          fallbackTimer = setTimeout(finish, 1500);
        }
      };
      frame = requestAnimationFrame(tick);
    });
  }
  return () => {
    disposed = true;
    clearTimeout(minimumTimer);
    clearTimeout(fallbackTimer);
    cancelAnimationFrame(frame);
    root.removeEventListener('animationend', animationEnd);
    document.body.classList.remove('intro-running');
  };
}

export function createVideoLoop(videos, { onActive, reducedMotion = false, fadeMs = 700, readyTimeoutMs = 3500, frameTimeoutMs = 1200 }) {
  let active = 0;
  let pending = false;
  let suspended = reducedMotion;
  let disposed = false;
  let generation = 0;
  let fadeTimer;
  let readyTimer;
  let resolveReady;
  const timers = new Set();
  const frameWaiters = new Set();
  const removers = [];
  const ready = new Promise(resolve => { resolveReady = resolve; });
  const markReady = () => { clearTimeout(readyTimer); resolveReady(); };
  const listen = (target, type, handler) => {
    target.addEventListener(type, handler);
    removers.push(() => target.removeEventListener(type, handler));
  };
  const firstFrame = video => new Promise(resolve => {
    let callback;
    let finished = false;
    const done = success => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      timers.delete(timeout);
      frameWaiters.delete(cancel);
      if (callback !== undefined) video.cancelVideoFrameCallback?.(callback);
      resolve(success);
    };
    const cancel = () => done(false);
    frameWaiters.add(cancel);
    const timeout = setTimeout(() => done(false), frameTimeoutMs);
    timers.add(timeout);
    if (video.requestVideoFrameCallback) callback = video.requestVideoFrameCallback(() => done(true));
    else {
      const frame = requestAnimationFrame(() => done(video.readyState >= 2));
      removers.push(() => cancelAnimationFrame(frame));
    }
  });
  const switchVideo = async () => {
    if (disposed || suspended || pending) return;
    pending = true;
    const token = ++generation;
    const previous = videos[active];
    const nextIndex = 1 - active;
    const next = videos[nextIndex];
    try {
      next.currentTime = 0;
      await next.play();
      if (disposed || suspended || token !== generation) { next.pause(); return; }
      const decoded = await firstFrame(next);
      if (disposed || suspended || token !== generation) return;
      if (!decoded) { next.pause(); return; }
      active = nextIndex;
      onActive(active);
      // Leave the outgoing video moving throughout the opacity crossfade.
      fadeTimer = setTimeout(() => {
        if (!disposed && active === nextIndex) previous.pause();
      }, fadeMs);
    } catch {
      // The outgoing video retains native looping, so rejection cannot blank it.
      if (token === generation) next.pause();
    } finally {
      if (token === generation) pending = false;
    }
  };
  videos.forEach((video, index) => {
    video.muted = true;
    video.loop = true; // Native looping is also the fallback if the handoff fails.
    video.pause();
    listen(video, 'loadeddata', () => { if (index === 0) markReady(); });
    listen(video, 'error', () => { if (index === 0) markReady(); });
    listen(video, 'timeupdate', () => {
      if (index === active && Number.isFinite(video.duration) && video.duration > 2 && video.currentTime >= video.duration - .85) switchVideo();
    });
  });
  readyTimer = setTimeout(markReady, readyTimeoutMs);
  if (videos[0].readyState >= 2 || reducedMotion) markReady();
  if (!reducedMotion) videos[0].play().catch(markReady);
  return {
    ready,
    suspend(value) {
      if (disposed || suspended === value || reducedMotion) return;
      suspended = value;
      generation++;
      pending = false;
      clearTimeout(fadeTimer);
      if (value) {
        frameWaiters.forEach(cancel => cancel());
        videos.forEach(video => video.pause());
      }
      else videos[active].play().catch(() => {});
    },
    dispose() {
      disposed = true;
      generation++;
      clearTimeout(fadeTimer);
      clearTimeout(readyTimer);
      frameWaiters.forEach(cancel => cancel());
      timers.forEach(timer => clearTimeout(timer));
      removers.forEach(remove => remove());
      videos.forEach(video => video.pause());
      resolveReady();
    }
  };
}
