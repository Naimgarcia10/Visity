import { Injectable, inject, NgZone } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

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
    try {
      const path = `${this.basePath[key]}/${new Date().getTime()}_${file.name}`;
      const storageRef = ref(this.storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('Archivo subido con éxito:', downloadURL);

      return this.ngZone.run(() => downloadURL);
    } catch (error) {
      this.ngZone.run(() => console.error('Error uploading file:', error));
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
}
