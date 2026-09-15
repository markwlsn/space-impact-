import { GameEngine } from './core/GameEngine';
import { soundSynthesizer } from './audio/SoundSynthesizer';
import { DeviceDetector, DeviceInfo } from './core/DeviceDetector';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element #gameCanvas not found!');
    return;
  }

  const engine = new GameEngine(canvas);
  const input = engine.getInputHandler();

  // HTML UI Elements
  const touchOverlay = document.getElementById('touch-overlay');
  const touchToggleBtn = document.getElementById('touchToggleBtn') as HTMLButtonElement;
  const deviceBadge = document.getElementById('device-badge');
  const fullscreenBtn = document.getElementById('fullscreenBtn') as HTMLButtonElement;
  const crtBtn = document.getElementById('crtBtn') as HTMLButtonElement;
  const crtOverlay = document.getElementById('crt-overlay');
  const muteBtn = document.getElementById('muteBtn') as HTMLButtonElement;
  const orientationOverlay = document.getElementById('orientation-overlay');
  const dismissOrientationBtn = document.getElementById('dismissOrientationBtn');
  const controlsHint = document.getElementById('controls-hint');

  // One-time global gesture listener to unlock Web Audio API on mobile
  const unlockAudio = () => {
    soundSynthesizer.initAudioContext();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });

  let orientationDismissed = false;
  dismissOrientationBtn?.addEventListener('click', () => {
    orientationDismissed = true;
    orientationOverlay?.classList.add('hidden');
  });

  /**
   * Applies layout, touch control visibility, and UI badges based on detected device
   */
  const applyDeviceConfiguration = (info: DeviceInfo) => {
    if (info.isMobile) {
      // Mobile / Tablet Browser Environment
      input.setTouchEnabled(true);
      touchOverlay?.classList.remove('hidden');

      if (deviceBadge) {
        deviceBadge.textContent = info.isTablet ? '📱 TABLET WEB' : '📱 MOBILE WEB';
        deviceBadge.className = 'nokia-badge device-badge';
      }

      if (touchToggleBtn) {
        touchToggleBtn.textContent = '📱 Touch: ON';
        touchToggleBtn.classList.add('active');
      }

      if (controlsHint) {
        controlsHint.innerHTML =
          '<strong>[Touch Joystick]</strong> Move &bull; <strong>[FIRE]</strong> Blaster &bull; <strong>[SPECIAL]</strong> Secondary &bull; <strong>[SWAP]</strong> Cycle';
      }

      // Check orientation on mobile phones
      if (!info.isLandscape && window.innerHeight > window.innerWidth && !orientationDismissed) {
        orientationOverlay?.classList.remove('hidden');
      } else {
        orientationOverlay?.classList.add('hidden');
      }
    } else {
      // Desktop / Laptop PC Browser Environment
      input.setTouchEnabled(false);
      touchOverlay?.classList.add('hidden');

      if (deviceBadge) {
        deviceBadge.textContent = '💻 PC WEB';
        deviceBadge.className = 'nokia-badge device-badge pc';
      }

      if (touchToggleBtn) {
        touchToggleBtn.textContent = '💻 Touch: OFF';
        touchToggleBtn.classList.remove('active');
      }

      if (controlsHint) {
        controlsHint.innerHTML =
          '[WASD / Arrows] Move &bull; [Space / Z] Fire &bull; [X / Shift] Special &bull; [Tab] Swap &bull; [P / Esc] Pause';
      }

      // Orientation warning is irrelevant on desktop monitors
      orientationOverlay?.classList.add('hidden');
    }
  };

  // Initialize automatic detection with real-time responsive listeners
  const initialInfo = DeviceDetector.initAutoDetect((updatedInfo) => {
    applyDeviceConfiguration(updatedInfo);
  });
  applyDeviceConfiguration(initialInfo);

  // Manual Touch Toggle Override (useful for touchscreen laptops or DevTools testing)
  touchToggleBtn?.addEventListener('click', () => {
    const isNowEnabled = input.toggleTouchControls();
    if (isNowEnabled) {
      touchOverlay?.classList.remove('hidden');
      touchToggleBtn.textContent = '📱 Touch: ON';
      touchToggleBtn.classList.add('active');
    } else {
      touchOverlay?.classList.add('hidden');
      touchToggleBtn.textContent = '📱 Touch: OFF';
      touchToggleBtn.classList.remove('active');
    }
  });

  // Fullscreen API toggle
  fullscreenBtn?.addEventListener('click', () => {
    const doc = document as any;
    const docEl = document.documentElement as any;

    if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      }
      fullscreenBtn.textContent = '⛶ Exit Full';
      fullscreenBtn.classList.add('active');
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
      fullscreenBtn.textContent = '⛶ Fullscreen';
      fullscreenBtn.classList.remove('active');
    }
  });

  document.addEventListener('fullscreenchange', () => {
    const isFull = !!document.fullscreenElement;
    if (fullscreenBtn) {
      fullscreenBtn.textContent = isFull ? '⛶ Exit Full' : '⛶ Fullscreen';
      fullscreenBtn.classList.toggle('active', isFull);
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
  const maxStickRadius = 35;

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
