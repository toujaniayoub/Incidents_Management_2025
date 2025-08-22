import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAdmissionComponent } from './dashboard-admission.component';

describe('DashboardAdmissionComponent', () => {
  let component: DashboardAdmissionComponent;
  let fixture: ComponentFixture<DashboardAdmissionComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardAdmissionComponent]
    });
    fixture = TestBed.createComponent(DashboardAdmissionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
