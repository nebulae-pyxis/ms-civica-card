import { civicaCardService } from './civica-card.service';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { fuseAnimations } from '../../../core/animations';
import { Subscription } from 'rxjs/Subscription';
import * as Rx from 'rxjs/Rx';
import { KeycloakService } from 'keycloak-angular';
import { BehaviorSubject, Subject } from 'rxjs/Rx';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'civica-card',
  templateUrl: './civica-card.component.html',
  styleUrls: ['./civica-card.component.scss'],
  animations: fuseAnimations
})
export class civicaCardComponent implements OnInit, OnDestroy {

  @ViewChild('webcomponent') webComponent;
  constructor( private keycloakService: KeycloakService) {
  }


  async ngOnInit() {
    this.webComponent.nativeElement.jwt = await this.keycloakService.getToken();
  }


  ngOnDestroy() {
  }

}
