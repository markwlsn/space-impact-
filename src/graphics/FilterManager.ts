import { ScreenFilter } from '../types';

export class FilterManager {
  private currentFilter: ScreenFilter = 'NOKIA_CLASSIC';
  private activeLevelFilter: ScreenFilter = 'NOKIA_CLASSIC';

  constructor() {
    this.loadFilter();
  }

  private loadFilter(): void {
    try {
      const saved = localStorage.getItem('space_impact_screen_filter') as ScreenFilter | null;
      if (saved) {
        this.currentFilter = saved;
      }
    } catch {
      this.currentFilter = 'NOKIA_CLASSIC';
    }
    this.activeLevelFilter = this.currentFilter;
    this.applyToDOM();
  }

  public getFilter(): ScreenFilter {
    return this.currentFilter;
  }

  public getActiveLevelFilter(): ScreenFilter {
    return this.activeLevelFilter;
  }

  public setFilter(filter: ScreenFilter): void {
    this.currentFilter = filter;
    this.activeLevelFilter = filter;
    try {
      localStorage.setItem('space_impact_screen_filter', filter);
    } catch {}
    this.applyToDOM();
  }

  /**
   * Called on sector warp. If RANDOM_PER_LEVEL is active, pick a random nostalgic filter!
   */
  public onSectorWarp(_stageId: number): ScreenFilter {
    if (this.currentFilter === 'RANDOM_PER_LEVEL') {
      const filters: ScreenFilter[] = ['NOKIA_CLASSIC', 'NOKIA_BLUE', 'GAMEBOY_DMG', 'CYBER_AMBER', 'MODERN_OLED'];
      // Deterministically varied or random
      const pick = filters[Math.floor(Math.random() * filters.length)];
      this.activeLevelFilter = pick;
      this.applyToDOM();
      return pick;
    } else {
      this.activeLevelFilter = this.currentFilter;
      this.applyToDOM();
      return this.currentFilter;
    }
  }

  public applyToDOM(): void {
    if (typeof document === 'undefined') return;

    const actual = this.activeLevelFilter === 'RANDOM_PER_LEVEL' ? 'NOKIA_CLASSIC' : this.activeLevelFilter;
    document.body.dataset.screenFilter = actual;

    // Toggle specific body class for styling
    document.body.classList.remove(
      'filter-nokia-classic',
      'filter-nokia-blue',
      'filter-gameboy-dmg',
      'filter-cyber-amber',
      'filter-modern-oled'
    );

    const classMap: Record<string, string> = {
      NOKIA_CLASSIC: 'filter-nokia-classic',
      NOKIA_BLUE: 'filter-nokia-blue',
      GAMEBOY_DMG: 'filter-gameboy-dmg',
      CYBER_AMBER: 'filter-cyber-amber',
      MODERN_OLED: 'filter-modern-oled',
    };

    if (classMap[actual]) {
      document.body.classList.add(classMap[actual]);
    }
  }

  public cycleFilter(): ScreenFilter {
    const list: ScreenFilter[] = [
      'NOKIA_CLASSIC',
      'NOKIA_BLUE',
      'GAMEBOY_DMG',
      'CYBER_AMBER',
      'MODERN_OLED',
      'RANDOM_PER_LEVEL',
    ];
    const idx = list.indexOf(this.currentFilter);
    const next = list[(idx + 1) % list.length];
    this.setFilter(next);
    return next;
  }
}

export const filterManager = new FilterManager();
