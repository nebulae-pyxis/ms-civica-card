import { Component, OnInit } from '@angular/core';
import { AfccRealoderService } from '../../afcc-realoder.service';
import { OperabilityState } from '../../utils/operability-sate';
import { map } from 'rxjs/operators';
import { KeycloakService } from 'keycloak-angular';
import { of, Subject, BehaviorSubject } from 'rxjs';
import * as JwtDecode from 'jwt-decode';

@Component({
  selector: 'app-afcc-info',
  templateUrl: './afcc-info.component.html',
  styleUrls: ['./afcc-info.component.scss']
})
export class AfccInfoComponent implements OnInit {
  posId;
  businessId;
  jwtName;
  posUserName;
  deviceName;
  batteryLevel$ = new BehaviorSubject<Number>(0);
  constructor(private afccReloaderService: AfccRealoderService, private keycloakService: KeycloakService) {}

  async ngOnInit() {
    let jwtDecoded;
    try {
      jwtDecoded = (JwtDecode(await this.keycloakService.getToken()));
    } catch (Error) {
      return null;
    }
    this.posId = this.afccReloaderService.conversation.posId;
    this.posUserName = this.afccReloaderService.conversation.posUserName;
    this.businessId = jwtDecoded.businessId;
    this.jwtName = jwtDecoded.name;
    this.afccReloaderService.reloaderConnected$.next(
      `device connected: ${this.deviceName}`
    );
    this.afccReloaderService.deviceName$.subscribe(name => {
      this.deviceName = name;
    });
    this.afccReloaderService.batteryLevel$.subscribe(batteryLevel => {
      this.batteryLevel$.next(batteryLevel);
    });
  }

  getBatteryIcon() {
    return this.batteryLevel$.pipe(
      map(batteryLevel => {
        return this.batteryLevelToBatteryIcon(batteryLevel);
      })
    );
  }

  getBatteryColor() {
    return this.batteryLevel$.pipe(
      map(batteryLevel => {
        return this.batteryLevelToBatteryColor(batteryLevel);
      })
    );
  }

  disconnect() {
    this.afccReloaderService.operabilityState$.next(
      OperabilityState.DISCONNECTED
    );
  }

  readCard() {
    this.afccReloaderService.operabilityState$.next(
      OperabilityState.READING_CARD
    );
  }

  batteryLevelToBatteryIcon(value) {
    return !value
      ? 'battery_unknown'
      : value <= 10
      ? 'battery_alert'
      : value > 10 && value <= 20
      ? 'battery_20'
      : value > 20 && value <= 30
      ? 'battery_30'
      : value > 30 && value <= 50
      ? 'battery_50'
      : value > 50 && value <= 60
      ? 'battery_60'
      : value > 60 && value <= 80
      ? 'battery_80'
      : value > 80 && value <= 90
      ? 'battery_90'
      : 'battery_full';
  }

  batteryLevelToBatteryColor(value) {
    return !value
      ? '#444'
      : value <= 10
      ? '#E5491C'
      : value > 10 && value <= 40
      ? '#F09900'
      : '#47BF07';
  }
}
