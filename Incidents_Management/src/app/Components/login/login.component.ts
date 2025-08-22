import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';

  constructor(private router: Router) {}

  login() {
  
    if (this.email === 'telecom@telecom.tn' && this.password === 'admin123') {
      this.router.navigate(['/dashboard_telecom']);
    } else {
      alert('Invalid credentials');
    }
  }

  handleCheckboxClick(event: Event): void {
    if (!this.email || !this.email.includes('@')) {
      (event.target as HTMLInputElement).checked = false;
      alert('Veuillez d\'abord entrer une adresse email valide.');
    }
  }
}