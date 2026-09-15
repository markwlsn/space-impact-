import { GameEngine } from './core/GameEngine';
import { soundSynthesizer } from './audio/SoundSynthesizer';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element #gameCanvas not found!');
    return;
  }

  const engine = new GameEngine(canvas);
  const input = engine.getInputHandler();

  // HTML Controls: Touch Overlay Setup (T14)
  const touchOverlay = document.getElementById('touch-overlay');
  const touchToggleBtn = document.getElementById('touchToggleBtn') as HTMLButtonElement;
  const crtBtn = document.getElementById('crtBtn') as HTMLButtonElement;
  const crtOverlay = document.getElementById('crt-overlay');
  const muteBtn = document.getElementById('muteBtn') as HTMLButtonElement;

  // Auto-detect touch or mobile display
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!hasTouch && window.innerWidth > 768) {
    touchOverlay?.classList.add('hidden');
    if (touchToggleBtn) touchToggleBtn.textContent = '📱 Touch: OFF';
  } else {
    touchOverlay?.classList.remove('hidden');
    input.isTouchEnabled = true;
    if (touchToggleBtn) touchToggleBtn.textContent = '📱 Touch: ON';
  }

  touchToggleBtn?.addEventListener('click', () => {
    const enabled = input.toggleTouchControls();
    if (enabled) {
      touchOverlay?.classList.remove('hidden');
      touchToggleBtn.textContent = '📱 Touch: ON';
      touchToggleBtn.classList.add('active');
    } else {
      touchOverlay?.classList.add('hidden');
      touchToggleBtn.textContent = '📱 Touch: OFF';
      touchToggleBtn.classList.remove('active');
    }
  });

  // CRT Scanline Toggle
  let crtActive = true;
  crtBtn?.addEventListener('click', () => {
    crtActive = !crtActive;
    if (crtActive) {
      crtOverlay?.classList.remove('disabled');
      crtBtn.textContent = '📺 CRT: ON';
      crtBtn.classList.add('active');
    } else {
      crtOverlay?.classList.add('disabled');
      crtBtn.textContent = '📺 CRT: OFF';
      crtBtn.classList.remove('active');
    }
  });

  // Mute Audio Toggle
  muteBtn?.addEventListener('click', () => {
    const isMuted = soundSynthesizer.toggleMute();
    if (isMuted) {
      muteBtn.textContent = '🔇 Audio: MUTED';
      muteBtn.classList.add('muted');
      muteBtn.classList.remove('active');
    } else {
      muteBtn.textContent = '🔊 Audio: ON';
      muteBtn.classList.remove('muted');
      muteBtn.classList.add('active');
    }
  });

  // Virtual Analog Stick / D-Pad Logic
  const touchDpad = document.getElementById('touch-dpad');
  const touchStick = document.getElementById('touch-stick');
  let dpadPointerId: number | null = null;
  const maxStickRadius = 38;

  if (touchDpad && touchStick) {
    const handleDpadMove = (clientX: number, clientY: number) => {
      const rect = touchDpad.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > maxStickRadius) {
        dx = (dx / dist) * maxStickRadius;
        dy = (dy / dist) * maxStickRadius;
      }

      touchStick.style.transform = `translate(${dx}px, ${dy}px)`;
      input.virtualJoystickPos = {
        x: dx / maxStickRadius,
        y: dy / maxStickRadius,
      };
    };

    const resetDpad = () => {
      dpadPointerId = null;
      touchStick.style.transform = 'translate(0px, 0px)';
      input.virtualJoystickPos = { x: 0, y: 0 };
    };

    touchDpad.addEventListener('pointerdown', (e: PointerEvent) => {
      dpadPointerId = e.pointerId;
      touchDpad.setPointerCapture(e.pointerId);
      handleDpadMove(e.clientX, e.clientY);
    });

    touchDpad.addEventListener('pointermove', (e: PointerEvent) => {
      if (dpadPointerId === e.pointerId) {
        handleDpadMove(e.clientX, e.clientY);
      }
    });

    touchDpad.addEventListener('pointerup', resetDpad);
    touchDpad.addEventListener('pointercancel', resetDpad);
  }

  // Virtual Action Buttons
  const setupTouchBtn = (
    id: string,
    onDown: () => void,
    onUp?: () => void
  ) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      onDown();
    });

    if (onUp) {
      el.addEventListener('pointerup', (e: PointerEvent) => {
        e.preventDefault();
        onUp();
      });
      el.addEventListener('pointercancel', (e: PointerEvent) => {
        e.preventDefault();
        onUp();
      });
    }
  };

  setupTouchBtn(
    'touch-primary',
    () => { input.virtualTouchPrimary = true; },
    () => { input.virtualTouchPrimary = false; }
  );

  setupTouchBtn(
    'touch-secondary',
    () => { input.virtualTouchSecondary = true; },
    () => { input.virtualTouchSecondary = false; }
  );

  setupTouchBtn('touch-cycle', () => {
    input.virtualTouchCycle = true;
  });

  setupTouchBtn('touch-pause', () => {
    input.virtualTouchPause = true;
  });

  // Start Main Engine
  engine.start();
});
