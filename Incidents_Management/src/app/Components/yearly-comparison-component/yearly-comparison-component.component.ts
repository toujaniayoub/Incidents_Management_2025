import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface IncidentComparison {
  problem_type: string;
  service_name: string;
  // site_name: string; // REMOVED site_name from this interface
  priority_name: string;
  count_year1: number;
  count_year2: number;
  percentage_change: number;
  change_description: string;
}

interface DropdownData {
  years: number[];
  // Assuming other dropdowns are not needed here, if they are, fetch them as well
}

@Component({
  selector: 'app-yearly-comparison',
  templateUrl: './yearly-comparison-component.component.html',
  styleUrls: ['./yearly-comparison-component.component.css']
})
export class YearlyComparisonComponent implements OnInit {
  years: number[] = [];
  selectedYear1: number | null = null;
  selectedYear2: number | null = null;
  comparisonResults: IncidentComparison[] = [];
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.getYearsForDropdowns();
  }

  getYearsForDropdowns(): void {
    this.isLoading = true;
    this.http.get<DropdownData>('http://localhost:5000/get_dropdown_data').subscribe({
      next: (data) => {
        this.years = data.years;
        // Set default selected years (e.g., last two available years)
        if (this.years.length >= 2) {
          this.selectedYear1 = this.years[0]; // Most recent year
          this.selectedYear2 = this.years[1]; // Second most recent year
          this.getYearlyComparison(); // Automatically load data on init
        } else if (this.years.length === 1) {
          this.selectedYear1 = this.years[0];
          this.selectedYear2 = this.years[0]; // If only one year, compare to itself (will show no change)
          this.getYearlyComparison();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching years:', error);
        this.errorMessage = 'Failed to load years for comparison. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  getYearlyComparison(): void {
    if (!this.selectedYear1 || !this.selectedYear2) {
      this.errorMessage = 'Please select both years for comparison.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.comparisonResults = []; // Clear previous results

    this.http.get<IncidentComparison[]>(`http://localhost:5000/get_yearly_incident_comparison?year1=${this.selectedYear1}&year2=${this.selectedYear2}`).subscribe({
      next: (data) => {
        this.comparisonResults = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching yearly comparison:', error);
        this.errorMessage = error.error?.error || 'Failed to fetch yearly comparison data.';
        this.isLoading = false;
      }
    });
  }

  formatPercentage(percentage: number): string {
    if (percentage === 1000000) {
      return 'N/A'; // For "Newly Emerged" from 0
    }
    if (percentage === -100) {
      return '-100%'; // For "Completely Resolved"
    }
    return `${percentage.toFixed(2)}%`;
  }

  getChangeClass(changeDescription: string): string {
    switch (changeDescription) {
      case 'Critical Spike':
      case 'Significant Increase':
      case 'Newly Emerged':
        return 'text-danger'; // Red for increases/new
      case 'Significant Decrease':
      case 'Completely Resolved':
        return 'text-success'; // Green for decreases/resolved
      case 'Moderate Increase':
      case 'No Significant Change':
      case 'Moderate Decrease':
        return 'text-info'; // Blue for moderate/no change
      case 'No Change':
        return 'text-muted'; // Grey for explicit no change
      default:
        return '';
    }
  }
}