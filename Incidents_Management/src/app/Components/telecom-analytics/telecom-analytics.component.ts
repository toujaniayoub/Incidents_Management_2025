import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Observable, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-telecom-analytics',
  templateUrl: './telecom-analytics.component.html',
  styleUrls: ['./telecom-analytics.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class TelecomAnalyticsComponent implements OnInit {
  powerBiUrl: SafeResourceUrl | null = null;
  selectedMenu: string = 'dashboard';

  predictionForm: FormGroup;
  predictionResult: string | null = null;
  predictionError: string | null = null;

  // Dropdown data
  problemTypes: string[] = [];
  serviceNames: string[] = [];
  priorities: string[] = [];
  siteNames: string[] = []; // All site names for the dropdown
  // dayOfWeeks: string[] = []; // Removed

  constructor(
    private sanitizer: DomSanitizer,
    private http: HttpClient
  ) {
    const now = new Date();
    // Format the current date and time to 'YYYY-MM-DDTHH:mm' for datetime-local input
    const currentDateTime = now.getFullYear() + '-' +
                            ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
                            ('0' + now.getDate()).slice(-2) + 'T' +
                            ('0' + now.getHours()).slice(-2) + ':' +
                            ('0' + now.getMinutes()).slice(-2);

    this.predictionForm = new FormGroup({
      problem_type: new FormControl('', Validators.required),
      service_name: new FormControl('', Validators.required),
      priorite_name: new FormControl('', Validators.required),
      site_name: new FormControl('', Validators.required),
      open_datetime: new FormControl(currentDateTime, Validators.required) // Only this
      // open_day_of_week: new FormControl('', Validators.required) // Removed
    });
  }

  ngOnInit(): void {
    const unsafeUrl = 'https://app.powerbi.com/reportEmbed?reportId=ed26698a-da7d-4bff-bd80-9ffde505ddd5&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730&filterPaneEnabled=false';
    this.powerBiUrl = this.sanitizer.bypassSecurityTrustResourceUrl(unsafeUrl);

    this.http.get<any>('http://localhost:5000/get_dropdown_data')
      .subscribe({
        next: (data) => {
          this.problemTypes = data.problemTypes || [];
          this.serviceNames = data.serviceNames || [];
          this.priorities = data.priorities || [];
          this.siteNames = data.siteNames || [];
          // this.dayOfWeeks = data.dayOfWeeks || []; // Removed

          // Set initial values for dropdowns after data is loaded
          this.predictionForm.get('problem_type')?.setValue(this.problemTypes.length > 0 ? this.problemTypes[0] : '');
          this.predictionForm.get('service_name')?.setValue(this.serviceNames.length > 0 ? this.serviceNames[0] : '');
          this.predictionForm.get('priorite_name')?.setValue(this.priorities.length > 0 ? this.priorities[0] : '');
          this.predictionForm.get('site_name')?.setValue(this.siteNames.length > 0 ? this.siteNames[0] : '');
          // this.predictionForm.get('open_day_of_week')?.setValue(this.dayOfWeeks.length > 0 ? this.dayOfWeeks[0] : ''); // Removed
        },
        error: (error) => {
          console.error('Error fetching dropdown data:', error);
          this.predictionError = 'Failed to load dropdown options. Please check the Flask server.';
        }
      });
  }

  showDashboard() {
    this.selectedMenu = 'dashboard';
  }

  showPredictionForm() {
    this.selectedMenu = 'timePrediction';
    this.predictionResult = null;
    this.predictionError = null;
  }

  showSolutionRecommender() {
    this.selectedMenu = 'recommendation';
  }

  onSubmitPrediction() {
    if (this.predictionForm.valid) {
      this.predictionError = null;
      this.predictionResult = 'Predicting...';

      const formData = this.predictionForm.value;
      const openDateTimeString = formData.open_datetime;

      const openDate = new Date(openDateTimeString);

      // Construct predictionData without open_day_of_week
      const predictionData = {
        problem_type: formData.problem_type,
        service_name: formData.service_name,
        priorite_name: formData.priorite_name,
        site_name: formData.site_name,
        open_year: openDate.getFullYear(),
        open_month: openDate.getMonth() + 1,
        open_day: openDate.getDate(),
        open_hour: openDate.getHours()
        // open_day_of_week: formData.open_day_of_week // Removed
      };

      console.log('Sending prediction request:', predictionData);

      this.http.post('http://localhost:5000/predict_resolution', predictionData)
        .subscribe({
          next: (response: any) => {
            if (response && response.predicted_time_minutes !== undefined) {
              this.predictionResult = `Predicted Resolution Time: ${response.predicted_time_minutes.toFixed(2)} minutes (${(response.predicted_time_minutes / 60).toFixed(2)} hours)`;
            } else {
              this.predictionResult = null;
              this.predictionError = 'Invalid prediction response received from server.';
            }
            console.log('Prediction successful:', response);
          },
          error: (error) => {
            this.predictionResult = null;
            this.predictionError = `Error during prediction: ${error.error?.error || 'Unknown server error'}. Check Flask server logs.`;
            console.error('Prediction error:', error);
          }
        });
    } else {
      this.predictionError = 'Please fill all required fields and ensure dates/times are valid.';
      this.predictionForm.markAllAsTouched();
    }
  }
}