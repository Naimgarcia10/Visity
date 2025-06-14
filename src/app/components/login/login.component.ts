import { Component, NgZone, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserModel } from '../../models/user_model';
import { CommonModule } from '@angular/common';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../shared/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule]
})
export class LoginComponent implements OnInit {
  formLogin: any;
  temporaryMessage: string = '';

  constructor(
    private fb: FormBuilder, 
    private firebaseAuth: Auth, 
    private router:Router, 
    private authService: AuthService,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
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

  /**
   * Maneja la acción de inicio de sesión del usuario.
   * 
   * Este método verifica si el formulario de inicio de sesión es válido y, 
   * en caso afirmativo, intenta autenticar al usuario utilizando las credenciales 
   * proporcionadas (correo electrónico y contraseña). Si la autenticación es exitosa, 
   * se almacena la información del usuario en la sesión y se redirige al usuario 
   * a la página de inicio después de un breve mensaje temporal. En caso de error, 
   * se muestra un mensaje temporal indicando el problema específico.
   * 
   * @returns {Promise<void>} Una promesa que se resuelve cuando la acción de inicio de sesión se completa.
   
  async loginAction(): Promise<void> {
    if (this.formLogin.valid) {
      const email = this.formLogin.get('email')!.value;
      const password = this.formLogin.get('password')!.value;

        try {
        await this.authService.login(email, password);
        this.formLogin.reset();
        this.temporaryMessage = 'Inicio de sesión exitoso';  
        
        setTimeout(() => {
          this.temporaryMessage = '';
          this.router.navigate(['/feed']);
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
  */

  async loginAction(): Promise<void> {
  if (this.formLogin.valid) {
    const email = this.formLogin.get('email')!.value;
    const password = this.formLogin.get('password')!.value;

    try {
      await this.authService.login(email, password);
      this.ngZone.run(() => {
        this.formLogin.reset();
        this.temporaryMessage = 'Inicio de sesión exitoso';
        setTimeout(() => {
          this.temporaryMessage = '';
          this.router.navigate(['/feed']);
        }, 3000);
      });
 
      
      // Ya no necesitamos hacer la navegación aquí
      // El evento de cambio de estado de autenticación en AuthService se encargará de esto
      // o el guard lo manejará la próxima vez que se active
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

  /**
   * Restablece la contraseña del usuario enviando un correo electrónico de restablecimiento.
   * 
   * Este método verifica si el campo de correo electrónico está lleno antes de intentar
   * enviar el correo de restablecimiento. Si el correo no está presente, muestra un mensaje
   * temporal solicitando al usuario que ingrese su correo electrónico. En caso de éxito,
   * muestra un mensaje indicando que el correo de restablecimiento fue enviado. Si ocurre
   * un error, maneja los códigos de error comunes y muestra mensajes apropiados.
   * 
   * @returns {Promise<void>} Una promesa que se resuelve cuando el proceso de restablecimiento
   * de contraseña se completa o se maneja un error.
   * 
   * @throws {Error} Puede lanzar errores relacionados con Firebase Authentication, como
   * 'auth/user-not-found', 'auth/invalid-email', o cualquier otro error inesperado.
   * 
   * $$$$$$$$$$$ MOVER A AUHT SERVICE $$$$$$$$$$$$$$
   */
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