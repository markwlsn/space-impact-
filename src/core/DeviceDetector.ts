export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export interface DeviceInfo {
  type: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
  isTouchOnly: boolean;
  isLandscape: boolean;
  userAgent: string;
}

export class DeviceDetector {
  private static cachedInfo: DeviceInfo | null = null;
  private static listeners: Array<(info: DeviceInfo) => void> = [];
  private static initialized: boolean = false;

  /**
   * Evaluates the current environment using multi-factor detection:
   * 1. Client Hints (navigator.userAgentData)
   * 2. Comprehensive Mobile/Tablet User-Agent Regex (including iPadOS)
   * 3. CSS Media Queries for Primary Pointer and Hover Capabilities
   * 4. Viewport Dimensions and Aspect Ratio
   */
  public static getInfo(): DeviceInfo {
    const nav = navigator as any;
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';

    // 1. Check Navigator Client Hints (Chromium Android / Windows / macOS)
    let isClientHintMobile = false;
    if (nav.userAgentData?.mobile !== undefined) {
      isClientHintMobile = nav.userAgentData.mobile;
    }

    // 2. User Agent Regex
    const mobileRegex = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS|FxiOS/i;
    const tabletRegex = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i;

    const isUaMobile = mobileRegex.test(ua);
    const isUaTablet = tabletRegex.test(ua);

    // iPadOS 13+ detection (reports as Macintosh with multi-touch)
    const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

    // 3. Media Queries for Pointer & Hover
    // (pointer: coarse) + (hover: none) = Smartphone / Tablet touchscreen
    // (pointer: fine) = Precision Mouse / Trackpad (Desktop PC)
    const isTouchOnly = window.matchMedia ? window.matchMedia('(pointer: coarse) and (hover: none)').matches : false;
    const hasFinePointer = window.matchMedia ? window.matchMedia('(pointer: fine)').matches : true;

    // 4. Multi-touch Capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // 5. Screen Geometry
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isSmallScreen = Math.max(screenWidth, screenHeight) <= 1024;
    const isLandscape = screenWidth > screenHeight;

    // Classification Determination
    let isMobile = false;
    let isTablet = false;
    let isDesktop = false;

    if (isIPadOS || isUaTablet) {
      isTablet = true;
      isMobile = true; // Tablets operate on touch-first web app paradigms
    } else if (isClientHintMobile || isUaMobile || (isTouchOnly && isSmallScreen)) {
      isMobile = true;
    } else if (hasFinePointer && !isTouchOnly) {
      // Desktop PC with mouse/trackpad
      isDesktop = true;
    } else if (isSmallScreen && hasTouch) {
      isMobile = true;
    } else {
      isDesktop = true;
    }

    const type: DeviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

    const info: DeviceInfo = {
      type,
      isMobile,
      isTablet,
      isDesktop,
      hasTouch,
      isTouchOnly,
      isLandscape,
      userAgent: ua,
    };

    DeviceDetector.cachedInfo = info;
    return info;
  }

  public static getLastCachedInfo(): DeviceInfo | null {
    return DeviceDetector.cachedInfo;
  }

  /**
   * Initializes real-time listeners for viewport resize, orientation changes,
   * and pointer capability shifts (e.g. Chrome DevTools device mode toggles).
   */
  public static initAutoDetect(onChange?: (info: DeviceInfo) => void): DeviceInfo {
    if (onChange) {
      DeviceDetector.listeners.push(onChange);
    }

    if (!DeviceDetector.initialized) {
      DeviceDetector.initialized = true;

      const triggerUpdate = () => {
        const freshInfo = DeviceDetector.getInfo();
        DeviceDetector.listeners.forEach((listener) => listener(freshInfo));
      };

      window.addEventListener('resize', triggerUpdate, { passive: true });
      window.addEventListener('orientationchange', triggerUpdate, { passive: true });

      // Match media query listeners
      if (window.matchMedia) {
        window.matchMedia('(pointer: coarse)').addEventListener('change', triggerUpdate);
        window.matchMedia('(orientation: landscape)').addEventListener('change', triggerUpdate);
      }
    }

    return DeviceDetector.getInfo();
  }

  public static onDeviceChange(callback: (info: DeviceInfo) => void): void {
    DeviceDetector.listeners.push(callback);
  }
}
