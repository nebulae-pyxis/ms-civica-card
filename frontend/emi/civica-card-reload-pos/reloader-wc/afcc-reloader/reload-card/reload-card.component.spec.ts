import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReloadCardComponent } from './reload-card.component';

describe('ReloadCardComponent', () => {
  let component: ReloadCardComponent;
  let fixture: ComponentFixture<ReloadCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReloadCardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReloadCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
