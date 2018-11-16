import { CivicaCardReloadPosService } from './civica-card-reload-pos.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { KeycloakService } from "keycloak-angular";
import { fuseAnimations } from '../../../core/animations';
import { Subscription } from 'rxjs/Subscription';
import * as Rx from 'rxjs/Rx';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'civica-card-reload-pos',
  templateUrl: './civica-card-reload-pos.component.html',
  styleUrls: ['./civica-card-reload-pos.component.scss'],
  animations: fuseAnimations
})
export class CivicaCardReloadPosComponent implements OnInit, OnDestroy {

  userDetails: KeycloakProfile = {};

  constructor(private civicaCardReloadPosService: CivicaCardReloadPosService, private keycloakService: KeycloakService) {

  }

  async ngOnInit() {
    this.userDetails = await this.keycloakService.loadUserProfile();
    console.log(`====${JSON.stringify(this.userDetails)}===`);
  }

  ngOnDestroy() {
  }

}
