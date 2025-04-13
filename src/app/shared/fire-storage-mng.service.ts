import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root'
})
export class FireStorageMngService {
  private basePath = '/profilePics';
  private storage: Storage = inject(Storage);

  async uploadFile(file: File): Promise<string> {
    try {
      const path = `${this.basePath}/${new Date().getTime()}_${file.name}`;
      const storageRef = ref(this.storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }
} 