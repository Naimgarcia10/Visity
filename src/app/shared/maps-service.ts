import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environment/firebaseConnection';

declare const google: any;
const apiKey = environment.googleMapsApiKey;

export interface Waypoint {
  location: string;
  stopover: boolean;
}

export interface Location {
  lat: number;
  lng: number;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private mapInitialized = new BehaviorSubject<boolean>(false);
  private waypoints: Waypoint[] = [];
  private map: any;
  private directionsService: any;
  private directionsRenderer: any;
  private searchBox: any;

  constructor() { }

  /**
   * Carga el script de Google Maps si no está disponible
   */
  loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        reject(new Error('El entorno no es compatible con el navegador.'));
        return;
      }

      if (typeof google !== 'undefined' && google.maps) {
        this.mapInitialized.next(true);
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.mapInitialized.next(true);
        resolve();
      };
      script.onerror = (error) => reject(error);
      document.head.appendChild(script);
    });
  }

  /**
   * Verifica si Google Maps está inicializado
   */
  isMapInitialized(): Observable<boolean> {
    return this.mapInitialized.asObservable();
  }

  /**
   * Inicializa el mapa en un elemento HTML específico
   */
  initMap(mapElement: HTMLElement, initialPosition: Location = { lat: 28.0778, lng: -15.4576 }): void {
    this.map = new google.maps.Map(mapElement, {
      center: initialPosition,
      zoom: 15,
    });

    this.directionsService = new google.maps.DirectionsService();
    this.directionsRenderer = new google.maps.DirectionsRenderer();
    this.directionsRenderer.setMap(this.map);

    // Configurar el listener de clics en el mapa
    this.map.addListener('click', (event: any) => {
      const location = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      this.addWaypoint(location);
    });
  }

  /**
   * Inicializa el cuadro de búsqueda
   */
  initSearchBox(inputElement: HTMLInputElement): void {
    this.searchBox = new google.maps.places.SearchBox(inputElement);

    this.searchBox.addListener('places_changed', () => {
      const places = this.searchBox.getPlaces();
      if (places && places.length > 0) {
        const place = places[0];
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };

        // Centrar el mapa en el destino seleccionado
        this.map.setCenter(location);
        this.map.setZoom(12);

        // Añadir el destino al itinerario
        this.addWaypoint(location);
      }
    });
  }

  /**
   * Añade un punto al itinerario
   */
  addWaypoint(location: Location): Waypoint {
    const waypoint = { 
      location: `${location.lat},${location.lng}`, 
      stopover: true 
    };
    this.waypoints.push(waypoint);
    this.updateRoute();
    return waypoint;
  }

  /**
   * Actualiza la ruta en el mapa
   */
  updateRoute(): void {
    if (this.waypoints.length < 2) return;

    const origin = this.waypoints[0].location;
    const destination = this.waypoints[this.waypoints.length - 1].location;
    const waypoints = this.waypoints.slice(1, -1);

    this.directionsService.route(
      {
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING
      },
      (result: any, status: any) => {
        if (status === google.maps.DirectionsStatus.OK) {
          this.directionsRenderer.setDirections(result);
        } else {
          console.error('Error al calcular la ruta:', status);
        }
      }
    );
  }

  /**
   * Obtiene todos los waypoints actuales
   */
  getWaypoints(): Waypoint[] {
    return [...this.waypoints];
  }

  /**
   * Limpia todos los waypoints y resetea la ruta
   */
  clearWaypoints(): void {
    this.waypoints = [];
    if (this.directionsRenderer) {
      this.directionsRenderer.setDirections({ routes: [] });
    }
  }

  /**
   * Genera URL para compartir en Google Maps
   */
  generateGoogleMapsUrl(): string | null {
    if (this.waypoints.length === 0) {
      return null;
    }

    const baseUrl = 'https://www.google.com/maps/dir/?api=1';
    const origin = this.waypoints[0].location;
    const destination = this.waypoints[this.waypoints.length - 1].location;
    const waypoints = this.waypoints.slice(1, -1).map(wp => wp.location).join('|');

    return `${baseUrl}&origin=${origin}&destination=${destination}&waypoints=${waypoints}`;
  }

  /**
   * Genera una imagen estática del mapa con la ruta
   */
  generateStaticMapImageUrl(width: number = 600, height: number = 400): string | null {
    if (this.waypoints.length === 0) {
      return null;
    }

    const staticMapBaseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    const markers = this.waypoints.map((wp, index) => 
      `markers=label:${String.fromCharCode(65 + index)}|${wp.location}`
    ).join('&');
    const path = `path=color:0x0000ff|weight:5|${this.waypoints.map(wp => wp.location).join('|')}`;

    return `${staticMapBaseUrl}?size=${width}x${height}&maptype=roadmap&${markers}&${path}&key=${apiKey}`;
  }

  /**
   * Centra el mapa en una ubicación específica
   */
  centerMap(location: Location): void {
    if (this.map) {
      this.map.setCenter(location);
    }
  }

  /**
   * Establece el nivel de zoom del mapa
   */
  setZoom(zoomLevel: number): void {
    if (this.map) {
      this.map.setZoom(zoomLevel);
    }
  }
}