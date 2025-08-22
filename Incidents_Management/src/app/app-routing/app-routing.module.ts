import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from '../Components/login/login.component'; 
import { HomePageComponent } from '../Components/home-page/home-page.component';
import { TelecomAnalyticsComponent } from '../Components/telecom-analytics/telecom-analytics.component';

const routes: Routes = [

  { path: '', redirectTo: 'home_page', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard_telecom', component: TelecomAnalyticsComponent },
  { path: 'home_page', component: HomePageComponent}
  
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule], 
})
export class AppRoutingModule { }