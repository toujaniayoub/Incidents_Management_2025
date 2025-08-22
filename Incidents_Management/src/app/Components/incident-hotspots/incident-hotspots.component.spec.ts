import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentHotspotsComponent } from './incident-hotspots.component';

describe('IncidentHotspotsComponent', () => {
  let component: IncidentHotspotsComponent;
  let fixture: ComponentFixture<IncidentHotspotsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [IncidentHotspotsComponent]
    });
    fixture = TestBed.createComponent(IncidentHotspotsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
