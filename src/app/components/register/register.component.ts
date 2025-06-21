import { Component, OnInit, NgZone } from '@angular/core';
import { FormBuilder, FormControl, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
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
  user: UserModel = {
    uid: '',
    email: '',
    username: '',
    fullname: '',
    birthdate: '',
    profilePic: '',
    followersCount: 0,
    followingCount: 0,
    preferredTravelType: ''
  };
  imageUrl: string = '';
  formRegister: any;
  temporaryMessage: string = '';
  isValidUsername: boolean = true;
  tags = {
    tipoViaje: [
      { label: 'Mochilero', selected: false },
      { label: 'Aventura', selected: false },
      { label: 'Cultural', selected: false },
      { label: 'Gastronómico', selected: false }
    ]
  };


  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private storageMng: FireStorageMngService,
    private firebaseAuth: Auth,
    private firestore: Firestore,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.formRegister = this.fb.group({
      fullname: ['', [Validators.required, Validators.minLength(3)]],
      username: ['', [Validators.required, Validators.minLength(3)], [usernameAvailableValidator(this.auth)]],
      birthdate: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      password2: ['', [Validators.required, Validators.minLength(6)]],
      profilePic: '',
      preferredTravelType: ['', [Validators.required]]
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

  get preferredTravelType() {
  return this.formRegister.get('preferredTravelType') as FormControl;
}


  /**
   * Registra un nuevo usuario utilizando Firebase Authentication y almacena sus datos en Firestore.
   * 
   * Este método realiza las siguientes acciones:
   * - Valida que el formulario de registro sea válido.
   * - Verifica que las contraseñas ingresadas coincidan.
   * - Crea un usuario en Firebase Authentication con el correo y contraseña proporcionados.
   * - Almacena los datos adicionales del usuario en Firestore, incluyendo nombre completo, nombre de usuario, fecha de nacimiento, correo electrónico y foto de perfil.
   * - Envía un correo de verificación al usuario registrado.
   * - Limpia el formulario de registro y redirige al usuario a la página de inicio de sesión.
   * 
   * En caso de error, muestra mensajes temporales indicando el problema, como correo ya en uso, correo inválido, contraseña débil, entre otros.
   * 
   * @returns {Promise<void>} Una promesa que se resuelve cuando el registro se completa o se maneja un error.
   */
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
        const uid = userCredential.user?.uid;

        if (uid) {
          const userRef = doc(this.firestore, 'users', uid);
          const userData = {
            fullname: this.fullname.value,
            username: username,
            birthdate: this.birthdate.value,
            email: email,
            profilePic: this.imageUrl || 'https://firebasestorage.googleapis.com/v0/b/visity-bd.firebasestorage.app/o/profilePics%2FprofilePic_dummy.png?alt=media&token=b7376b23-046a-43b0-a103-6da464c0b455',
            preferredTravelType: this.preferredTravelType.value,
          };
          console.log('userData', userData);
        
          await setDoc(userRef, userData);
          await sendEmailVerification(userCredential.user);

          this.ngZone.run(() => {
            this.formRegister.reset();
            this.imageUrl = '';
            this.temporaryMessage = 'Usuario creado con éxito. Por favor, verifica tu correo electrónico para continuar';

            setTimeout(() => {
              this.temporaryMessage = '';
              this.router.navigateByUrl('/feed');
            }, 3000);
          });
        }
      } catch (error: any) {
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

  /**
   * Maneja el evento de carga de un archivo, subiendo la imagen seleccionada a Firebase Storage
   * y actualizando el formulario con la URL de la imagen subida.
   *
   * @param e - Evento que contiene los archivos seleccionados por el usuario.
   * @returns Una promesa que se resuelve cuando la operación de carga se completa.
   *
   * @throws Muestra un mensaje temporal de error si ocurre un problema durante la carga de la imagen.
   */
  async onUpload(e: any): Promise<void> {
    if (e.target.files && e.target.files[0]) {
      try {
        const file = e.target.files[0];
        const url = await this.storageMng.uploadFile(file, 'profilePics');

        // Asegura que Angular detecte el cambio
        this.ngZone.run(() => {
          this.imageUrl = url;
          this.temporaryMessage = 'Foto de perfil subida con éxito';
        });
      } catch (error) {
        this.ngZone.run(() => {
          this.temporaryMessage = 'Error al subir la foto de perfil';
        });
      }
    }
  }

  onPreferredTravelTypeChange(selectedTag: string) {
    const current = this.preferredTravelType.value;
    if (current === selectedTag) {
      this.preferredTravelType.setValue(''); // desmarca si ya estaba seleccionado
    } else {
      this.preferredTravelType.setValue(selectedTag);
    }
  }


}