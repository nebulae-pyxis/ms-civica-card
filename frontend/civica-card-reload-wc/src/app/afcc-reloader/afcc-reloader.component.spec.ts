import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AfccReloaderComponent } from './afcc-reloader.component';

describe('AfccReloaderComponent', () => {
  let component: AfccReloaderComponent;
  let fixture: ComponentFixture<AfccReloaderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AfccReloaderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AfccReloaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
