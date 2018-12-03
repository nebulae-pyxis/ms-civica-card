import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'bluetooth-not-available',
  templateUrl: './bluetooth-not-available.component.html',
  styleUrls: ['./bluetooth-not-available.component.scss']
})
export class BluetoothNotAvailableComponent implements OnInit {

  constructor() { }

  ngOnInit() {
    console.log('llega a nueva pagina');
  }

}
