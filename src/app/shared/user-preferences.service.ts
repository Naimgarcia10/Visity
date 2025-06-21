import { Injectable } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, updateDoc } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  constructor(private firestore: Firestore) {}

  // Guardar preferencias iniciales
  async setPreferences(userId: string, preferences: {
    travelTypes?: string[],
    budgets?: string[],
    weathers?: string[]
  }) {
    const ref = doc(this.firestore, 'userPreferences', userId);
    await setDoc(ref, preferences, { merge: true });
  }

  // Obtener preferencias del usuario
  async getPreferences(userId: string): Promise<any | null> {
    const ref = doc(this.firestore, 'userPreferences', userId);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  // Actualizar contadores de tags por likes (opcional)
  async incrementLikedTag(userId: string, tag: string) {
    const ref = doc(this.firestore, 'userPreferences', userId);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};

    const likedTags = data['likedTags'] || {};
    likedTags[tag] = (likedTags[tag] || 0) + 1;

    await updateDoc(ref, { likedTags });
  }
}