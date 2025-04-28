import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root'
})
export class FireStorageMngService {
  private basePath = 
  {'profilePics': '/profilePics', 
  'posts': '/posts'
};
  private storage: Storage = inject(Storage);

  async uploadFile(file: File, key: 'profilePics' | 'posts'): Promise<string> {
    try {
      const path = `${this.basePath[key]}/${new Date().getTime()}_${file.name}`;
      const storageRef = ref(this.storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Sube múltiples archivos a Firebase Storage
   * @param files Archivos a subir
   * @param key Categoría de los archivos
   * @returns Array de URLs de descarga
   */
  async uploadMultipleFiles(files: File[], key: 'profilePics' | 'posts'): Promise<string[]> {
    try {
      const uploadPromises = files.map(file => this.uploadFile(file, key));
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading multiple files:', error);
      throw error;
    }
  }
} 