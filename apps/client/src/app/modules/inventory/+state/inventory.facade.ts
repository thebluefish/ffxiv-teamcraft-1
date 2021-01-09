import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { InventoryPartialState } from './inventory.reducer';
import { inventoryQuery } from './inventory.selectors';
import { LoadInventory, ResetInventory, SetContentId, UpdateInventory } from './inventory.actions';
import { ContainerType } from '../../../model/user/inventory/container-type';
import { UserInventory } from '../../../model/user/inventory/user-inventory';
import { filter, map, shareReplay } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { SettingsService } from '../../settings/settings.service';
import { AuthFacade } from '../../../+state/auth.facade';
import { IpcService } from '../../../core/electron/ipc.service';
import { LodestoneIdEntry } from '../../../model/user/lodestone-id-entry';
import { CharacterResponse } from '@xivapi/angular-client';
import { ItemSearchResult } from '../../../model/user/inventory/item-search-result';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class InventoryFacade {
  loaded$ = this.store.pipe(select(inventoryQuery.getLoaded));

  inventory$: Observable<UserInventory> = this.store.pipe(
    select(inventoryQuery.getInventory),
    filter(inventory => inventory !== null),
    map((inventory: UserInventory) => inventory.clone()),
    shareReplay(1)
  );

  characterEntries: Array<LodestoneIdEntry & { character: CharacterResponse }>;

  constructor(private store: Store<InventoryPartialState>, private authFacade: AuthFacade, private ipc: IpcService,
              private translate: TranslateService, settings: SettingsService) {
    if (settings.clearInventoryOnStartup) {
      this.resetInventory();
    }
    this.ipc.on('dat:content-id', (event, contentId) => {
      this.setContentId(contentId);
    });
    this.authFacade.characterEntries$.subscribe(entries => {
      this.characterEntries = entries;
    });
  }

  public getContainerTranslateKey(item: ItemSearchResult): string {
    if (item.retainerName && item.containerId !== ContainerType.RetainerMarket) {
      return item.retainerName;
    }
    return this.translate.instant(`INVENTORY.BAG.${this.getContainerName(item.containerId)}`);
  }

  public getContainerDisplayName(item: ItemSearchResult): string {
    const containerName = this.getContainerTranslateKey(item);
    if (item.isCurrentCharacter) {
      return containerName;
    } else {
      const entry = this.characterEntries.find(e => e.contentId === item.contentId);
      return `${containerName} (${entry?.character.Character.Name || this.translate.instant('COMMON.Unknown')})`;
    }
  }

  public getContainerName(containerId: number): string {
    switch (containerId) {
      case ContainerType.Bag0:
      case ContainerType.Bag1:
      case ContainerType.Bag2:
      case ContainerType.Bag3:
        return 'Bag';
      case ContainerType.RetainerBag0:
      case ContainerType.RetainerBag1:
      case ContainerType.RetainerBag2:
      case ContainerType.RetainerBag3:
      case ContainerType.RetainerBag4:
      case ContainerType.RetainerBag5:
      case ContainerType.RetainerBag6:
        return 'RetainerBag';
      case ContainerType.RetainerMarket:
        return 'RetainerMarket';
      case ContainerType.SaddleBag0:
      case ContainerType.SaddleBag1:
      case ContainerType.PremiumSaddleBag0:
      case ContainerType.PremiumSaddleBag1:
        return 'SaddleBag';
      case ContainerType.FreeCompanyBag0:
      case ContainerType.FreeCompanyBag1:
      case ContainerType.FreeCompanyBag2:
      case ContainerType.FreeCompanyBag3:
      case ContainerType.FreeCompanyBag4:
      case ContainerType.FreeCompanyBag5:
      case ContainerType.FreeCompanyBag6:
      case ContainerType.FreeCompanyBag7:
      case ContainerType.FreeCompanyBag8:
      case ContainerType.FreeCompanyBag9:
      case ContainerType.FreeCompanyBag10:
        return 'FC_chest';
      case ContainerType.ArmoryOff:
      case ContainerType.ArmoryHead:
      case ContainerType.ArmoryBody:
      case ContainerType.ArmoryHand:
      case ContainerType.ArmoryWaist:
      case ContainerType.ArmoryLegs:
      case ContainerType.ArmoryFeet:
      case ContainerType.ArmoryNeck:
      case ContainerType.ArmoryEar:
      case ContainerType.ArmoryWrist:
      case ContainerType.ArmoryRing:
      case ContainerType.ArmorySoulCrystal:
      case ContainerType.ArmoryMain:
        return 'Armory';
      case ContainerType.GearSet0:
        return 'Current_Gear';
    }
    return 'Other';
  }

  load(): void {
    this.store.dispatch(new LoadInventory());
  }

  updateInventory(inventory: UserInventory, force = false): void {
    this.store.dispatch(new UpdateInventory(inventory, force));
  }

  resetInventory(): void {
    this.store.dispatch(new ResetInventory());
  }

  setContentId(contentId: string): void {
    this.store.dispatch(new SetContentId(contentId));
  }
}
