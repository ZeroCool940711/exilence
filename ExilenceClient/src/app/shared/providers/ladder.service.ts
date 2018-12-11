import 'rxjs/add/operator/map';

import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import { AppConfig } from '../../../environments/environment';
import { Player } from '../interfaces/player.interface';
import { AccountService } from './account.service';
import { AnalyticsService } from './analytics.service';
import { LogService } from './log.service';
import { PartyService } from './party.service';
import { Subscription } from 'rxjs/internal/Subscription';

@Injectable()
export class LadderService implements OnDestroy {
  localPlayer: Player;
  isPolling = false;
  cooldown = false;
  private playerSub: Subscription;
  constructor(
    private http: HttpClient,
    private accountService: AccountService,
    private partyService: PartyService,
    private analyticsService: AnalyticsService,
    private logService: LogService
  ) {
    this.playerSub = this.accountService.player.subscribe(res => {
      if (res !== undefined) {
        this.localPlayer = res;
      }
    });
  }

  ngOnDestroy() {
    if (this.playerSub !== undefined) {
      this.playerSub.unsubscribe();
    }
    console.log('ladderservice destroyed');
  }

  startPollingLadder() {
    if (!this.isPolling) {
      this.isPolling = true;
      setInterval(x => {
        if (!this.cooldown) {
          this.pollLadder();
        }
      },
        1000 * 60 * 4); // fetch ladder every 4 minutes.
    }
  }

  stopPollingLadder() {
    if (this.isPolling) {
      this.isPolling = false;
    }
  }

  pollLadder() {
    this.getLadderInfoForCharacter(this.localPlayer.character.league, this.localPlayer.character.name)
      .subscribe(data => {
        if (data !== null) {
          const player = this.localPlayer;
          player.ladderInfo = data.ladder;
          this.partyService.updatePlayer(player);
        }
      });
  }

  getLadderInfoForCharacter(league: string, characterName: string): Observable<any> {
    this.cooldown = true;
    setTimeout(x => {
      this.cooldown = false;
    }, 1000 * 60 * 4);
    // tslint:disable-next-line:max-line-length
    this.logService.log(`Retriving ladder for league: ${league} and character: ${characterName}`);
    const parameters = `?character=${characterName}&league=${league}`;
    this.analyticsService.sendEvent('ladder', `GET LadderInfo`);
    return this.http.get(AppConfig.url + 'api/ladder/character' + parameters)
      .catch(e => {
        this.logService.log(`Retriving ladder for league: ${league} and character: ${characterName}`, e, true);
        return Observable.of(null);
      });
  }
}
