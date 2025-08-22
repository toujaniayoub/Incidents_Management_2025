import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YearlyComparisonComponentComponent } from './yearly-comparison-component.component';

describe('YearlyComparisonComponentComponent', () => {
  let component: YearlyComparisonComponentComponent;
  let fixture: ComponentFixture<YearlyComparisonComponentComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [YearlyComparisonComponentComponent]
    });
    fixture = TestBed.createComponent(YearlyComparisonComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
