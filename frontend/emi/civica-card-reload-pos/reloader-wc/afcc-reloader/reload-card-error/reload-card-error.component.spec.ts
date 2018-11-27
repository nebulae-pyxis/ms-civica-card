import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReloadCardErrorComponent } from './reload-card-error.component';

describe('ReloadCardErrorComponent', () => {
  let component: ReloadCardErrorComponent;
  let fixture: ComponentFixture<ReloadCardErrorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReloadCardErrorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReloadCardErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
