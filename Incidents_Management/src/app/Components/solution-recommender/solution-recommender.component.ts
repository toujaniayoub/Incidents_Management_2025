import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormGroup, FormControl, Validators } from '@angular/forms';

interface RecommendedSolution {
  solution_description: string;
  average_resolution_time_minutes: number;
}

@Component({
  selector: 'app-solution-recommender',
  templateUrl: './solution-recommender.component.html',
  styleUrls: ['./solution-recommender.component.css']
})
export class SolutionRecommenderComponent implements OnInit {

  solutionForm: FormGroup;
  problemTypes: string[] = [];
  serviceNames: string[] = [];
  priorities: string[] = [];
  siteNames: string[] = [];

  recommendedSolutions: RecommendedSolution[] | null = null;
  recommendationError: string | null = null;
  isLoading: boolean = false;

  constructor(private http: HttpClient) {
    this.solutionForm = new FormGroup({
      problem_type: new FormControl('', Validators.required),
      service_name: new FormControl('', Validators.required),
      priorite_name: new FormControl('', Validators.required),
      site_name: new FormControl('', Validators.required)
    });
  }

  ngOnInit(): void {
    this.fetchDropdownData();
  }

  fetchDropdownData(): void {
    this.http.get<any>('http://localhost:5000/get_dropdown_data')
      .subscribe({
        next: (data) => {
          this.problemTypes = data.problemTypes || [];
          this.serviceNames = data.serviceNames || [];
          this.priorities = data.priorities || [];
          this.siteNames = data.siteNames || [];

          // Set initial values for dropdowns
          this.solutionForm.get('problem_type')?.setValue(this.problemTypes.length > 0 ? this.problemTypes[0] : '');
          this.solutionForm.get('service_name')?.setValue(this.serviceNames.length > 0 ? this.serviceNames[0] : '');
          this.solutionForm.get('priorite_name')?.setValue(this.priorities.length > 0 ? this.priorities[0] : '');
          this.solutionForm.get('site_name')?.setValue(this.siteNames.length > 0 ? this.siteNames[0] : '');
        },
        error: (error) => {
          console.error('Error fetching dropdown data for recommender:', error);
          this.recommendationError = 'Failed to load dropdown options. Please check the Flask server.';
        }
      });
  }

  onSubmitSolutionRecommendation(): void {
    if (this.solutionForm.valid) {
      this.isLoading = true;
      this.recommendationError = null;
      this.recommendedSolutions = null;

      const formData = this.solutionForm.value;
      console.log('Sending solution recommendation request:', formData);

      this.http.post<RecommendedSolution[]>('http://localhost:5000/recommend_solution', formData)
        .subscribe({
          next: (response) => {
            this.recommendedSolutions = response;
            this.isLoading = false;
            console.log('Solution recommendation successful:', response);
          },
          error: (error) => {
            this.recommendationError = `Error during recommendation: ${error.error?.error || 'Unknown server error'}. Check Flask server logs.`;
            this.isLoading = false;
            console.error('Solution recommendation error:', error);
          }
        });
    } else {
      this.recommendationError = 'Please select all required fields.';
      this.solutionForm.markAllAsTouched();
    }
  }

  // Helper function for display formatting
  formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  }
}