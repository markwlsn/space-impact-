import { ShipId, ShipDefinition } from '../types';

const GOLD_STORAGE_KEY = 'space_impact_credits_v1';
const UNLOCKED_SHIPS_KEY = 'space_impact_unlocked_ships_v1';
const EQUIPPED_SHIP_KEY = 'space_impact_equipped_ship_v1';

export const SHIP_CATALOG: Record<ShipId, ShipDefinition> = {
  NOKIA_VIPER: {
    id: 'NOKIA_VIPER',
    name: 'NOKIA VIPER MK-IV',
    franchise: 'NOKIA HERITAGE',
    price: 0,
    description: 'The legendary vector interceptor. Perfectly balanced flight dynamics and dual plasma cannons.',
    speed: 360,
    maxHealth: 100,
    fireRate: 0.125, // 8 shots / sec
    primaryWeaponName: 'DUAL PLASMA BOLTS',
    specialTrait: 'BALANCED REACTOR: Steady and reliable handling in all sectors',
    color: '#00f0ff',
    accentColor: '#ffffff',
  },
  X_WING: {
    id: 'X_WING',
    name: 'T-65 X-WING FIGHTER',
    franchise: 'STAR WARS ALLIANCE',
    price: 500,
    description: 'Incom T-65 with S-foils locked in attack position. 4 wingtip laser cannons with R2 astromech.',
    speed: 390,
    maxHealth: 120,
    fireRate: 0.10, // 10 shots / sec
    primaryWeaponName: 'QUAD CONVERGING LASERS',
    specialTrait: 'R2 ASTROMECH: Automatically repairs 1% hull integrity every 3 seconds',
    color: '#ff3344',
    accentColor: '#ffaa00',
  },
  MILLENNIUM_FALCON: {
    id: 'MILLENNIUM_FALCON',
    name: 'YT-1300 MILLENNIUM',
    franchise: 'STAR WARS CORRELLIAN',
    price: 1200,
    description: 'Heavy Corellian freighter with reinforced deflector plates and high-impact dual quad-turrets.',
    speed: 320,
    maxHealth: 200,
    fireRate: 0.14, // 7 shots / sec
    primaryWeaponName: 'HEAVY TRIPLE TURRET',
    specialTrait: 'DEFLECTOR ARMOR: Takes 25% reduced damage from all collisions',
    color: '#ffea00',
    accentColor: '#00aaff',
  },
  USS_ENTERPRISE: {
    id: 'USS_ENTERPRISE',
    name: 'USS CONSTITUTION',
    franchise: 'STAR TREK FEDERATION',
    price: 2000,
    description: 'Federation flagship with vector saucer and twin warp nacelles. Continuous phaser beam sweeps.',
    speed: 350,
    maxHealth: 160,
    fireRate: 0.08, // Rapid phaser pulses
    primaryWeaponName: 'TWIN PHASER BEAMS',
    specialTrait: 'QUANTUM TORPEDOES: Secondary ordnance deals +50% devastating explosive damage',
    color: '#ff9900',
    accentColor: '#44aaff',
  },
  TIE_PHANTOM: {
    id: 'TIE_PHANTOM',
    name: 'TIE PHANTOM INTERCEPTOR',
    franchise: 'STAR WARS IMPERIAL',
    price: 3000,
    description: 'Tri-wing stealth vector fighter with cloaking shields and hyper-velocity emerald laser barrages.',
    speed: 430, // Ultra-high speed
    maxHealth: 90, // Glass cannon
    fireRate: 0.08, // 12.5 shots / sec
    primaryWeaponName: 'EMERALD HYPER LASERS',
    specialTrait: 'HYPERSPACE DASH: Damage invulnerability duration doubled to 2.4 seconds',
    color: '#00ff66',
    accentColor: '#ff0055',
  },
};

export class ShopManager {
  private gold: number = 200; // Starter gold
  private unlockedShips: Set<ShipId> = new Set(['NOKIA_VIPER']);
  private equippedShipId: ShipId = 'NOKIA_VIPER';

  constructor() {
    this.loadData();
  }

  public getGold(): number {
    return this.gold;
  }

  public addGold(amount: number): void {
    this.gold = Math.max(0, this.gold + amount);
    this.saveData();
  }

  public spendGold(amount: number): boolean {
    if (this.gold < amount) return false;
    this.gold -= amount;
    this.saveData();
    return true;
  }

  public isShipUnlocked(id: ShipId): boolean {
    return this.unlockedShips.has(id);
  }

  public unlockShip(id: ShipId): boolean {
    const ship = SHIP_CATALOG[id];
    if (!ship) return false;
    if (this.unlockedShips.has(id)) return true;

    if (this.spendGold(ship.price)) {
      this.unlockedShips.add(id);
      this.equippedShipId = id; // Auto-equip newly bought ship
      this.saveData();
      return true;
    }
    return false;
  }

  public equipShip(id: ShipId): boolean {
    if (!this.unlockedShips.has(id)) return false;
    this.equippedShipId = id;
    this.saveData();
    return true;
  }

  public getEquippedShip(): ShipDefinition {
    return SHIP_CATALOG[this.equippedShipId] || SHIP_CATALOG.NOKIA_VIPER;
  }

  public getShip(id: ShipId): ShipDefinition {
    return SHIP_CATALOG[id] || SHIP_CATALOG.NOKIA_VIPER;
  }

  public getAllShips(): ShipDefinition[] {
    return Object.values(SHIP_CATALOG);
  }

  private loadData(): void {
    try {
      const savedGold = localStorage.getItem(GOLD_STORAGE_KEY);
      if (savedGold !== null) {
        this.gold = parseInt(savedGold, 10) || 200;
      }

      const savedUnlocked = localStorage.getItem(UNLOCKED_SHIPS_KEY);
      if (savedUnlocked) {
        const parsed: ShipId[] = JSON.parse(savedUnlocked);
        parsed.forEach((id) => {
          if (SHIP_CATALOG[id]) this.unlockedShips.add(id);
        });
      }

      const savedEquipped = localStorage.getItem(EQUIPPED_SHIP_KEY) as ShipId | null;
      if (savedEquipped && this.unlockedShips.has(savedEquipped)) {
        this.equippedShipId = savedEquipped;
      }
    } catch (e) {
      console.warn('Could not load shop data from localStorage:', e);
    }
  }

  private saveData(): void {
    try {
      localStorage.setItem(GOLD_STORAGE_KEY, this.gold.toString());
      localStorage.setItem(
        UNLOCKED_SHIPS_KEY,
        JSON.stringify(Array.from(this.unlockedShips))
      );
      localStorage.setItem(EQUIPPED_SHIP_KEY, this.equippedShipId);
    } catch (e) {
      console.warn('Could not save shop data to localStorage:', e);
    }
  }
}

export const shopManager = new ShopManager();
