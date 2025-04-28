import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../shared/auth.service';
import { UserModel } from '../../models/user_model';
import { FireStorageMngService } from '../../shared/fire-storage-mng.service';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Auth, sendEmailVerification, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { usernameAvailableValidator } from '../../validators/username-async.validator';


@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
  ],
  providers: [FireStorageMngService]
})
export class RegisterComponent implements OnInit {
  user: UserModel = new UserModel();
  imageUrl: string = '';
  formRegister: any;
  temporaryMessage: string = '';
  isValidUsername: boolean = true;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private storageMng: FireStorageMngService,
    private firebaseAuth: Auth,
    private firestore: Firestore,
    private router: Router
  ) {}

  ngOnInit() {
    this.formRegister = this.fb.group({
      fullname: ['', [Validators.required, Validators.minLength(3)]],
      username: ['', [Validators.required, Validators.minLength(3)], [usernameAvailableValidator(this.auth)]],
      birthdate: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      password2: ['', [Validators.required, Validators.minLength(6)]],
      profilePic: ''
    });

  } 

  // Getters para acceder a los controles del formulario
  get fullname() {
    return this.formRegister.get('fullname') as FormControl;
  }

  get username() {
    return this.formRegister.get('username') as FormControl;
  }

  get birthdate() {
    return this.formRegister.get('birthdate') as FormControl;
  }

  get email() {
    return this.formRegister.get('email') as FormControl;
  }

  get password() {
    return this.formRegister.get('password') as FormControl;
  }

  get password2() {
    return this.formRegister.get('password2') as FormControl;
  }

  get profilePic() {
    return this.formRegister.get('profilePic') as FormControl;
  }

  // Acción de registro
  async registerAction(): Promise<void> {
    if (this.formRegister.valid) {
      const email = this.email.value.trim().toLowerCase();
      const username = this.username.value.trim().toLowerCase();
      const password = this.password.value;
      const password2 = this.password2.value;

      // Verifica que las contraseñas coincidan
      if (password !== password2) {
        this.temporaryMessage = 'Las contraseñas no coinciden';
        return;
      }

      try {
        // Crea el usuario con Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(this.firebaseAuth, email, password);

        // Obtén el UID del usuario
        const uid = userCredential.user?.uid;
        if (uid) {
          const userRef = doc(this.firestore, 'users', uid);
          const userData = {
            fullname: this.fullname.value,
            username: username,
            birthdate: this.birthdate.value,
            email: email,
            profilePic: this.imageUrl || 'https://firebasestorage.googleapis.com/v0/b/visity-bd.firebasestorage.app/o/profilePics%2FprofilePic_dummy.png?alt=media&token=b7376b23-046a-43b0-a103-6da464c0b455'
          };
          console.log('userData', userData);
        // Guarda los datos del usuario en Firestore
        await setDoc(userRef, userData);

        // Limpia el formulario
        this.formRegister.reset();

        // Envía el correo de verificación
        await sendEmailVerification(userCredential.user);

          // Redirige al login
          this.temporaryMessage = 'Usuario creado con éxito. Por favor, verifica tu correo electrónico para continuar';
          setTimeout(() => {
            this.temporaryMessage = '';
            this.router.navigate(['/login']);
          }, 3000);
        }
      } catch (error: any) {
        // Manejo de errores
        const errorCode = error.code;
        if (errorCode === 'auth/email-already-in-use') {
          this.temporaryMessage = 'El correo ya está en uso';
        } else if (errorCode === 'auth/invalid-email') {
          this.temporaryMessage = 'El correo no es válido';
        } else if (errorCode === 'auth/weak-password') {
          this.temporaryMessage = 'La contraseña debe tener al menos 6 caracteres';
        } else {
          this.temporaryMessage = 'Error al registrar el usuario: ' + error.message;
        }
      }
    }
  }

  // Manejo de la subida de la foto de perfil
  async onUpload(e: any): Promise<void> {
    if (e.target.files && e.target.files[0]) {
      try {
        const file = e.target.files[0];
        this.imageUrl = await this.storageMng.uploadFile(file, 'profilePics'); // Sube la imagen a Firebase Storage
        this.profilePic.setValue(this.imageUrl); // Establece la URL de la imagen en el formulario
        this.temporaryMessage = 'Foto de perfil subida con éxito';
      } catch (error) {
        this.temporaryMessage = 'Error al subir la foto de perfil';
      }
    }
  }
}