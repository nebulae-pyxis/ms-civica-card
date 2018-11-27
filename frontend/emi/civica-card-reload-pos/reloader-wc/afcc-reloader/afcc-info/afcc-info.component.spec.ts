import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AfccInfoComponent } from './afcc-info.component';

describe('AfccInfoComponent', () => {
  let component: AfccInfoComponent;
  let fixture: ComponentFixture<AfccInfoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AfccInfoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AfccInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
