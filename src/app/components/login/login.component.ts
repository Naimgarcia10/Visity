import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../shared/auth.service';
import { UserModel } from '../../models/user_model';
import { CommonModule } from '@angular/common';
import { Auth, signInWithEmailAndPassword, sendPasswordResetEmail } from '@angular/fire/auth';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule]
})
export class LoginComponent implements OnInit {
  user: UserModel = new UserModel();
  formLogin: any;
  imageUrl: string = 'https://firebasestorage.googleapis.com/v0/b/visity-bd.firebasestorage.app/o/profilePics%2F1742213128185_messi_pic.jpg?alt=media&token=9f6d3ad0-d583-4a4d-8e94-2d16a28150f2';
  temporaryMessage: string = '';

  constructor(private fb: FormBuilder, private firebaseAuth: Auth) {}

  ngOnInit() {
    this.user = new UserModel();
    this.formLogin = this.fb.group({
      'email': ['', [Validators.required, Validators.email]],
      'password': ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get email() {
    return this.formLogin.get('email') as FormControl;
  }

  get password() {
    return this.formLogin.get('password') as FormControl;
  }

  async loginAction(): Promise<void> {
    if (this.formLogin.valid) {
      const email = this.formLogin.get('email')!.value;
      const password = this.formLogin.get('password')!.value;

      try {
        const userCredential = await signInWithEmailAndPassword(this.firebaseAuth, email, password);
        this.formLogin.reset();
        this.temporaryMessage = 'Inicio de sesión exitoso';
        sessionStorage.setItem('user', JSON.stringify(userCredential.user));
        setTimeout(() => {
          this.temporaryMessage = '';
          location.href = '/'; // Redirige a la página principal
        }, 3000);
      } catch (error: any) {
        const errorCode = error.code;
        if (errorCode === 'auth/user-not-found') {
          this.temporaryMessage = 'El usuario no existe';
        } else if (errorCode === 'auth/wrong-password') {
          this.temporaryMessage = 'La contraseña es incorrecta';
        } else if (errorCode === 'auth/invalid-email') {
          this.temporaryMessage = 'El correo no es válido';
        } else if (errorCode === 'auth/invalid-credential') {
        this.temporaryMessage = 'Las credenciales no son válidas';
      } else {
          this.temporaryMessage = error.message;
        }
      }
    }
  }

  async resetPassword(): Promise<void> {
    const email = this.formLogin.get('email')!.value;
    console.log('Email ingresado:', email);

  
    if (!email) {
      this.temporaryMessage = 'Por favor, ingrese su correo electrónico';
      return;
    }
  
    try {
      await sendPasswordResetEmail(this.firebaseAuth, email);
      this.temporaryMessage = 'Correo de restablecimiento de contraseña enviado';
      setTimeout(() => {
        this.temporaryMessage = '';
      }, 5000);
    } catch (error: any) {
      const errorCode = error.code;
      if (errorCode === 'auth/user-not-found') {
        this.temporaryMessage = 'El usuario no existe';
      } else if (errorCode === 'auth/invalid-email') {
        this.temporaryMessage = 'El correo no es válido';
      } else {
        this.temporaryMessage = error.message;
      }
    }
  }
}