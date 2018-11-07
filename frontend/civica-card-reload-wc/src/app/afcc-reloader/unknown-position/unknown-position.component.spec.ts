import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UnknownPositionComponent } from './unknown-position.component';

describe('UnknownPositionComponent', () => {
  let component: UnknownPositionComponent;
  let fixture: ComponentFixture<UnknownPositionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UnknownPositionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UnknownPositionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
