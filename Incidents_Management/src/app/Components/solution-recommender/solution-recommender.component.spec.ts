import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolutionRecommenderComponent } from './solution-recommender.component';

describe('SolutionRecommenderComponent', () => {
  let component: SolutionRecommenderComponent;
  let fixture: ComponentFixture<SolutionRecommenderComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SolutionRecommenderComponent]
    });
    fixture = TestBed.createComponent(SolutionRecommenderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
