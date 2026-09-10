import { InputState, Vector2D } from '../types';

export class InputHandler {
  private state: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    primaryFire: false,
    secondaryFire: false,
    pause: false,
    moveVector: { x: 0, y: 0 },
  };

  private keysDown: Set<string> = new Set();
  private pauseTriggered: boolean = false;
  private cycleSecondaryTriggered: boolean = false;

  // Touch Virtual Controls state
  public isTouchEnabled: boolean = false;
  public virtualJoystickPos: Vector2D = { x: 0, y: 0 };
  public virtualTouchPrimary: boolean = false;
  public virtualTouchSecondary: boolean = false;
  public virtualTouchCycle: boolean = false;
  public virtualTouchPause: boolean = false;

  constructor() {
    this.setupKeyboardListeners();
    this.detectTouchDevice();
  }

  private detectTouchDevice(): void {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      this.isTouchEnabled = true;
    }
  }

  public toggleTouchControls(): boolean {
    this.isTouchEnabled = !this.isTouchEnabled;
    return this.isTouchEnabled;
  }

  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keysDown.add(e.code);

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        this.pauseTriggered = true;
      }
      if (e.code === 'Tab' || e.code === 'KeyC') {
        e.preventDefault();
        this.cycleSecondaryTriggered = true;
      }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keysDown.delete(e.code);
    });

    // Reset inputs when losing window focus
    window.addEventListener('blur', () => {
      this.keysDown.clear();
      this.virtualJoystickPos = { x: 0, y: 0 };
      this.virtualTouchPrimary = false;
      this.virtualTouchSecondary = false;
    });
  }

  public consumePause(): boolean {
    const p = this.pauseTriggered || this.virtualTouchPause;
    this.pauseTriggered = false;
    this.virtualTouchPause = false;
    return p;
  }

  public consumeCycleSecondary(): boolean {
    const c = this.cycleSecondaryTriggered || this.virtualTouchCycle;
    this.cycleSecondaryTriggered = false;
    this.virtualTouchCycle = false;
    return c;
  }

  public update(): InputState {
    // 1. Check Keyboard Inputs
    const upKey = this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp');
    const downKey = this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown');
    const leftKey = this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft');
    const rightKey = this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight');

    const primaryKey = this.keysDown.has('Space') || this.keysDown.has('KeyZ');
    const secondaryKey =
      this.keysDown.has('KeyX') ||
      this.keysDown.has('ShiftLeft') ||
      this.keysDown.has('ShiftRight') ||
      this.keysDown.has('ControlLeft') ||
      this.keysDown.has('ControlRight');

    let moveX = 0;
    let moveY = 0;

    if (rightKey) moveX += 1;
    if (leftKey) moveX -= 1;
    if (downKey) moveY += 1;
    if (upKey) moveY -= 1;

    let primary = primaryKey;
    let secondary = secondaryKey;

    // 2. Poll Gamepad API (FR-15, T14)
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (gp && gp.connected) {
        // D-pad buttons
        if (gp.buttons[12]?.pressed) moveY -= 1; // Up
        if (gp.buttons[13]?.pressed) moveY += 1; // Down
        if (gp.buttons[14]?.pressed) moveX -= 1; // Left
        if (gp.buttons[15]?.pressed) moveX += 1; // Right

        // Left Analog Stick with deadzone
        const deadzone = 0.22;
        const stickX = gp.axes[0] || 0;
        const stickY = gp.axes[1] || 0;
        if (Math.abs(stickX) > deadzone) {
          moveX += stickX;
        }
        if (Math.abs(stickY) > deadzone) {
          moveY += stickY;
        }

        // Action buttons
        if (gp.buttons[0]?.pressed || gp.buttons[2]?.pressed || gp.buttons[7]?.pressed) {
          primary = true; // A / X / RT
        }
        if (gp.buttons[1]?.pressed || gp.buttons[3]?.pressed || gp.buttons[6]?.pressed) {
          secondary = true; // B / Y / LT
        }
        if (gp.buttons[4]?.pressed || gp.buttons[5]?.pressed) {
          // Bumpers cycle weapon
          this.cycleSecondaryTriggered = true;
        }
        if (gp.buttons[9]?.pressed) {
          // Start button pauses
          this.pauseTriggered = true;
        }
      }
    }

    // 3. Virtual Touch Overlay Controls
    if (this.isTouchEnabled) {
      if (Math.abs(this.virtualJoystickPos.x) > 0.1 || Math.abs(this.virtualJoystickPos.y) > 0.1) {
        moveX += this.virtualJoystickPos.x;
        moveY += this.virtualJoystickPos.y;
      }
      if (this.virtualTouchPrimary) primary = true;
      if (this.virtualTouchSecondary) secondary = true;
    }

    // Clamp and normalize final movement vector
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    if (len > 1.0) {
      moveX /= len;
      moveY /= len;
    }

    this.state = {
      up: moveY < -0.2,
      down: moveY > 0.2,
      left: moveX < -0.2,
      right: moveX > 0.2,
      primaryFire: primary,
      secondaryFire: secondary,
      pause: this.pauseTriggered,
      moveVector: { x: moveX, y: moveY },
    };

    return this.state;
  }

  public getState(): InputState {
    return this.state;
  }
}
