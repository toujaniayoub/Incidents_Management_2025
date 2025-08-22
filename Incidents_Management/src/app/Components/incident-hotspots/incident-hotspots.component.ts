import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscription, timer } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';

// Interface for Real-time Hotspots (unchanged)
interface HotspotIncident {
  problem_type: string;
  service_name: string;
  site_name: string;
  priority_name: string;
  current_incident_count: number;
  historical_avg_count: number;
  deviation_percentage: number;
  deviation_description: string;
}

// UPDATED Interface for Yearly Comparison - make counts optional
interface YearlyComparisonItem {
  problem_type: string;
  service_name: string;
  site_name: string;
  priority_name: string;
  count_year1?: number; // Made optional
  count_year2?: number; // Made optional
  percentage_change: number;
  change_description: string;
}

interface DropdownData {
  years: number[];
}

@Component({
  selector: 'app-incident-hotspots',
  templateUrl: './incident-hotspots.component.html',
  styleUrls: ['./incident-hotspots.component.css']
})
export class IncidentHotspotsComponent implements OnInit, OnDestroy {

  // Properties for Real-time Hotspots
  hotspots: HotspotIncident[] | null = null;
  hotspotError: string | null = null;
  private realtimeRefreshSubscription: Subscription | null = null;

  // Properties for Yearly Comparison
  yearlyComparisonData: YearlyComparisonItem[] | null = null;
  yearlyComparisonError: string | null = null;
  years: number[] = [];
  selectedYear1: number | null = null;
  selectedYear2: number | null = null;

  // Common Loading and Mode
  isLoading: boolean = true;
  currentMode: 'realtime' | 'yearly' = 'realtime'; // Default to real-time

  private readonly REALTIME_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.fetchDropdownData(); // Fetch years for dropdowns
    this.startRealtimeHotspotPolling(); // Start polling for real-time hotspots
  }

  ngOnDestroy(): void {
    if (this.realtimeRefreshSubscription) {
      this.realtimeRefreshSubscription.unsubscribe();
    }
  }

  // --- Data Fetching Methods ---

  fetchDropdownData(): void {
    this.http.get<DropdownData>('http://localhost:5000/get_dropdown_data').subscribe(
      data => {
        this.years = data.years;
        // Set default selected years for comparison (e.g., latest two)
        if (this.years.length >= 2) {
          this.selectedYear1 = this.years[0]; // Latest year (e.g., 2024)
          this.selectedYear2 = this.years[1]; // Second latest year (e.g., 2023)
        } else if (this.years.length === 1) {
          this.selectedYear1 = this.years[0];
          this.selectedYear2 = null; // No second year to compare
        }
      },
      error => {
        console.error('Error fetching years:', error);
        // Handle error, maybe show a message
      }
    );
  }

  startRealtimeHotspotPolling(): void {
    if (this.realtimeRefreshSubscription) {
      this.realtimeRefreshSubscription.unsubscribe(); // Stop any existing polling
    }
    this.currentMode = 'realtime';
    this.hotspotError = null; // Clear previous errors
    this.isLoading = true;

    this.realtimeRefreshSubscription = timer(0, this.REALTIME_REFRESH_INTERVAL_MS).pipe(
      switchMap(() => this.getRealtimeHotspots()),
      catchError(error => {
        console.error('Error fetching real-time hotspots:', error);
        this.hotspotError = `Failed to load real-time hotspots: ${error.error?.error || 'Unknown server error'}.`;
        this.isLoading = false;
        return of([]); // Return an empty observable to prevent the stream from breaking
      })
    ).subscribe(
      (data: HotspotIncident[]) => {
        this.hotspots = data;
        this.isLoading = false;
        console.log('Real-time Incident Hotspots loaded:', data);
      },
      (error) => {
        // Error already handled in catchError
      }
    );
  }

  getRealtimeHotspots(): Observable<HotspotIncident[]> {
    return this.http.get<HotspotIncident[]>('http://localhost:5000/get_incident_hotspots');
  }

  fetchYearlyComparison(): void {
    if (!this.selectedYear1 || !this.selectedYear2) {
      this.yearlyComparisonError = 'Please select both years for comparison.';
      return;
    }
    if (this.realtimeRefreshSubscription) {
      this.realtimeRefreshSubscription.unsubscribe(); // Stop real-time polling
    }
    this.currentMode = 'yearly';
    this.yearlyComparisonError = null; // Clear previous errors
    this.isLoading = true;
    this.yearlyComparisonData = null; // Clear previous data

    this.http.get<YearlyComparisonItem[]>(`http://localhost:5000/get_yearly_incident_comparison?year1=${this.selectedYear1}&year2=${this.selectedYear2}`).subscribe(
      data => {
        this.yearlyComparisonData = data;
        this.isLoading = false;
        console.log('Yearly Comparison data loaded:', data);
      },
      error => {
        console.error('Error fetching yearly comparison:', error);
        this.yearlyComparisonError = `Failed to load yearly comparison: ${error.error?.error || 'Unknown server error'}.`;
        this.isLoading = false;
      }
    );
  }

  // --- Helper Functions for Display ---

  // Helper function to get badge class based on deviation for Real-time
  getDeviationBadgeClass(percentage: number): string {
    if (percentage >= 200) {
      return 'bg-danger'; // Critical Spike
    } else if (percentage >= 100) {
      return 'bg-warning'; // Significant Increase
    } else if (percentage >= 50) {
      return 'bg-info'; // Moderate Increase
    } else if (percentage < 0 && percentage >= -50) {
      return 'bg-success'; // Moderate Decrease (for the rare case of negative deviation in hotspots)
    } else if (percentage < -50) {
      return 'bg-success'; // Significant Decrease
    } else {
      return 'bg-secondary'; // Default, no significant change
    }
  }

  // Helper function to get badge class for Yearly Comparison change
  getChangeBadgeClass(percentage: number): string {
    if (percentage >= 50) { // Significant increase
      return 'bg-danger';
    } else if (percentage >= 10) { // Moderate increase
      return 'bg-warning';
    } else if (percentage <= -50) { // Significant decrease
      return 'bg-success';
    } else if (percentage <= -10) { // Moderate decrease
      return 'bg-info';
    } else if (percentage === 0) {
      return 'bg-secondary'; // No change
    } else if (percentage > 0) { // Small increase
      return 'bg-primary';
    } else { // Small decrease
      return 'bg-dark';
    }
  }

  // Helper to format percentage
  formatPercentage(percentage: number): string {
    // Add null/undefined check
    if (percentage === undefined || percentage === null) {
      return '-'; // Or 'N/A' or '0%'
    }
    return percentage.toFixed(0) + '%';
  }

  // UPDATED Helper to format count (for cases where it's a float after averaging historical)
  // This is line 199 as per your error
  formatCount(count: number | undefined | null): string {
    if (count === undefined || count === null) {
      return '0'; // Return '0' or '-' for undefined/null counts
    }
    return count.toFixed(0); // Safely call toFixed on a number
  }
}