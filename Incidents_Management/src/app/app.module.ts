import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { LoginComponent } from './Components/login/login.component';
import { AppRoutingModule } from './app-routing/app-routing.module';
import { RegisterComponent } from './Components/register/register.component';
import { HomePageComponent } from  './Components/home-page/home-page.component';
import { PowerBIEmbedModule } from 'powerbi-client-angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DashboardAdmissionComponent } from './Components/dashboard-admission/dashboard-admission.component';
import { TelecomAnalyticsComponent } from './Components/telecom-analytics/telecom-analytics.component';
import { SolutionRecommenderComponent } from './Components/solution-recommender/solution-recommender.component';
import { IncidentHotspotsComponent } from './Components/incident-hotspots/incident-hotspots.component';

import { YearlyComparisonComponent } from './Components/yearly-comparison-component/yearly-comparison-component.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    HomePageComponent,
    DashboardAdmissionComponent,
    TelecomAnalyticsComponent,
    SolutionRecommenderComponent,
    IncidentHotspotsComponent,
    YearlyComparisonComponent
    

  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    PowerBIEmbedModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule
    
    
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
