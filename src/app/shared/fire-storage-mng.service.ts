import { Injectable, inject, NgZone } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL, FirebaseStorage } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root'
})
export class FireStorageMngService {
  private basePath = {
    'profilePics': '/profilePics',
    'posts': '/posts'
  };
  private storage: Storage = inject(Storage);
  private ngZone: NgZone = inject(NgZone);

    async uploadFile(file: File, key: 'profilePics' | 'posts'): Promise<string> {
      const allowedTypes = ['image/jpg', 'image/jpeg', 'image/png'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      try {
        // Validación del tipo MIME
        if (!allowedTypes.includes(file.type)) {
          throw new Error('Formato de archivo no permitido. Solo se admiten archivos JPG o PNG.');
        }

        // Validación del tamaño
        if (file.size > maxSize) {
          throw new Error('El archivo supera el tamaño máximo permitido (5MB).');
        }

        // Generación de ruta con timestamp para evitar colisiones
        const path = `${this.basePath[key]}/${Date.now()}_${file.name}`;
        const storageRef = ref(this.storage, path);

        // Subida del archivo
        const snapshot = await uploadBytes(storageRef, file);

        // Obtención de la URL de descarga
        const downloadURL = await getDownloadURL(snapshot.ref);

        console.log('Archivo subido con éxito:', downloadURL);

        return this.ngZone.run(() => downloadURL);
      } catch (error) {
        this.ngZone.run(() => console.error('Error al subir el archivo:', error));
        throw error;
      }
    }


  async uploadMultipleFiles(files: File[], key: 'profilePics' | 'posts'): Promise<string[]> {
    try {
      const uploadPromises = files.map(file => this.uploadFile(file, key));
      return await Promise.all(uploadPromises);
    } catch (error) {
      this.ngZone.run(() => console.error('Error uploading multiple files:', error));
      throw error;
    }
  }

  public getStorage(): FirebaseStorage {
    return this.storage;
  }
}
