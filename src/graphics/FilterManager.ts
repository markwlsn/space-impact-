import { ScreenFilter } from '../types';

export class FilterManager {
  private activeLevelFilter: ScreenFilter = 'MODERN_OLED';

  constructor() {
    this.resetMenuFilter();
  }

  public getFilter(): ScreenFilter {
    return this.activeLevelFilter;
  }

  public getActiveLevelFilter(): ScreenFilter {
    return this.activeLevelFilter;
  }

  public isNokiaActive(): boolean {
    return this.activeLevelFilter === 'NOKIA_CLASSIC';
  }

  /**
   * Reset filter to MODERN_OLED so Main Menu, Shop, Settings, and Pilot entry
   * are rendered in crisp, readable high-contrast full color.
   */
  public resetMenuFilter(): void {
    this.activeLevelFilter = 'MODERN_OLED';
    this.applyToDOM();
  }

  /**
   * Automatically assigns screen filter based on endless sector:
   * - Sector 1 starts in authentic NOKIA 3310 MONOCHROME LCD mode!
   * - Sector 2 warps into high-tech Cyber Fortress (MODERN OLED)
   * - Sector 3 warps into Retro Anomaly (NOKIA 3310)
   * - Sector 4 warps into Quantum Void (MODERN OLED)
   * - Endless Sector 5+: Alternates odd/even or retro anomaly (Odd = Nokia 3310, Even = Modern OLED)
   */
  public setSectorFilter(stageId: number): ScreenFilter {
    let target: ScreenFilter = 'MODERN_OLED';
    if (stageId === 1 || stageId % 2 === 1) {
      target = 'NOKIA_CLASSIC';
    } else {
      target = 'MODERN_OLED';
    }

    this.activeLevelFilter = target;
    this.applyToDOM();
    return target;
  }

  /**
   * Sector warp hook
   */
  public onSectorWarp(stageId: number): ScreenFilter {
    return this.setSectorFilter(stageId);
  }

  public setFilter(filter: ScreenFilter): void {
    this.activeLevelFilter = filter;
    this.applyToDOM();
  }

  public applyToDOM(): void {
    if (typeof document === 'undefined') return;

    const actual = this.activeLevelFilter;
    document.body.dataset.screenFilter = actual;

    // Toggle specific body class for styling
    document.body.classList.remove(
      'filter-nokia-classic',
      'filter-nokia-blue',
      'filter-gameboy-dmg',
      'filter-cyber-amber',
      'filter-modern-oled'
    );

    if (actual === 'NOKIA_CLASSIC') {
      document.body.classList.add('filter-nokia-classic');
    } else if (actual === 'NOKIA_BLUE') {
      document.body.classList.add('filter-nokia-blue');
    } else if (actual === 'GAMEBOY_DMG') {
      document.body.classList.add('filter-gameboy-dmg');
    } else if (actual === 'CYBER_AMBER') {
      document.body.classList.add('filter-cyber-amber');
    } else {
      document.body.classList.add('filter-modern-oled');
    }
  }
}

export const filterManager = new FilterManager();
