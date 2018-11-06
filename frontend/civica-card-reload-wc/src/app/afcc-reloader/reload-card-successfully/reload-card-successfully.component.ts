import { Component, OnInit } from '@angular/core';
import { AfccRealoderService } from '../../afcc-realoder.service';

@Component({
  selector: 'app-reload-card-successfully',
  templateUrl: './reload-card-successfully.component.html',
  styleUrls: ['./reload-card-successfully.component.scss']
})
export class ReloadCardSuccessfullyComponent implements OnInit {
  reloadValue;
  finalValue;
  constructor(private afccReloaderService: AfccRealoderService) { }

  ngOnInit() {
    this.afccReloaderService.cardReloadDone$.next('here final card info and part of the conversation');
    this.reloadValue = this.afccReloaderService.conversation.reloadValue;
    this.finalValue = this.afccReloaderService.conversation.finalValue;
  }

}
