// src/app/validators/username-async.validator.ts
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { AuthService } from '../shared/auth.service'; // Asegúrate de que esta ruta es correcta
import { debounceTime, map, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export function usernameAvailableValidator(authService: AuthService): AsyncValidatorFn {
  return (control: AbstractControl) => {
    const username = control.value?.trim().toLowerCase();

    if (!username || username.length < 3) {
      return of(null); // No validar si está vacío o muy corto
    }

    return of(username).pipe(
      debounceTime(500),
      switchMap(u =>
        authService.isUsernameAvailable(u).then((available) => {
          return available ? null : { usernameTaken: true };
        }).catch(() => {
          return { usernameCheckFailed: true };
        })
      )
    );
  };
}
