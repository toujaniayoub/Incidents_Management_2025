import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TelecomAnalyticsComponent } from './telecom-analytics.component';

describe('TelecomAnalyticsComponent', () => {
  let component: TelecomAnalyticsComponent;
  let fixture: ComponentFixture<TelecomAnalyticsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TelecomAnalyticsComponent]
    });
    fixture = TestBed.createComponent(TelecomAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
