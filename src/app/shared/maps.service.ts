import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environment/firebaseConnection';

declare const google: any;
const apiKey = environment.googleMapsApiKey;

export interface Waypoint {
  location: string;
  stopover: boolean;
  name?: string;
  address?: string; // Nueva propiedad para almacenar la dirección completa
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
  private searchInput: HTMLInputElement | null = null;

  constructor(private zone: NgZone) { }

  
  /**
   * Carga el script de Google Maps en el documento actual.
   * 
   * @returns Una promesa que se resuelve cuando el script de Google Maps se ha cargado correctamente
   *          o se rechaza si ocurre un error durante la carga o si el entorno no es compatible.
   * 
   * @throws {Error} Si el entorno no es compatible con el navegador.
   * 
   * @remarks
   * - Si Google Maps ya está cargado (`google.maps` está definido), la promesa se resuelve inmediatamente.
   * - El script se carga de forma asíncrona y se adjunta al elemento `<head>` del documento.
   * - Asegúrate de reemplazar `apiKey` con una clave válida de la API de Google Maps.
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
   * Verifica si el mapa ha sido inicializado.
   *
   * @returns Un observable que emite un valor booleano indicando si el mapa está inicializado.
   */
  isMapInitialized(): Observable<boolean> {
    return this.mapInitialized.asObservable();
  }

  /**
   * Inicializa el mapa en el elemento HTML proporcionado.
   *
   * @param mapElement - El elemento HTML donde se renderizará el mapa.
   * @param initialPosition - La posición inicial del mapa (latitud y longitud).
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
      
      // Ahora usamos la versión asíncrona
      this.addWaypoint(location).then(waypoint => {
        console.log(`Waypoint añadido: ${waypoint.name}`);
      }).catch(error => {
        console.error('Error al añadir waypoint:', error);
      });
    });
  }

 
  /**
   * Inicializa un cuadro de búsqueda de Google Maps Places vinculado a un elemento de entrada HTML.
   * 
   * @param inputElement - El elemento HTMLInputElement que se utilizará como cuadro de búsqueda.
   * 
   * Este método configura un `SearchBox` de Google Maps Places para permitir que el usuario busque ubicaciones.
   * Cuando el usuario selecciona un lugar, se obtiene su información, se centra el mapa en la ubicación seleccionada
   * y se agrega un nuevo waypoint a la lista de waypoints. Finalmente, se actualiza la ruta en el mapa.
   */
  initSearchBox(inputElement: HTMLInputElement): void {
    this.searchBox = new google.maps.places.SearchBox(inputElement);
    this.searchInput = inputElement; 

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

        // Cuando el usuario busca un lugar, ya tenemos su nombre
        const waypoint: Waypoint = { 
          location: `${location.lat},${location.lng}`, 
          stopover: true,
          name: place.name || place.formatted_address || `Waypoint ${this.waypoints.length + 1}`,
          address: place.formatted_address
        };
        
        this.waypoints.push(waypoint);
        this.updateRoute();
      }
    });
  }


/**
 * Limpia el cuadro de búsqueda eliminando cualquier lugar seleccionado
 * y restableciendo el texto visible en el campo de entrada.
 * 
 * @remarks
 * Este método verifica si existen las propiedades `searchBox` y `searchInput`
 * antes de intentar limpiarlas. Si `searchBox` está definido, se elimina el lugar
 * seleccionado configurándolo como `null`. Si `searchInput` está definido, 
 * se borra el texto visible en el campo de entrada.
 */
clearSearchBox(): void {
  if (this.searchBox) {
    this.searchBox.set('place', null);
  }
  
  // También limpiar el texto visible en el campo de entrada
  if (this.searchInput) {
    this.searchInput.value = '';
  }
}

  /**
   * Añade un waypoint a la lista de waypoints y actualiza la ruta en el mapa.
   * 
   * @param location - La ubicación del waypoint a añadir.
   * @returns Una promesa que se resuelve con el waypoint creado.
   */
  addWaypoint(location: Location): Promise<Waypoint> {
    // Crear waypoint inicial con nombre temporal
    const waypoint: Waypoint = { 
      location: `${location.lat},${location.lng}`, 
      stopover: true,
      name: `Waypoint ${this.waypoints.length + 1}` // Nombre temporal
    };
    
    // Añadimos el waypoint inmediatamente para actualizar la ruta
    this.waypoints.push(waypoint);
    this.updateRoute();
    
    // Ahora obtenemos el nombre real del lugar mediante geocodificación inversa
    return new Promise((resolve, reject) => {
      try {
        // Verificar si la API está disponible
        if (!google?.maps?.Geocoder) {
          console.warn('API de geocodificación no disponible');
          resolve(waypoint);
          return;
        }
        
        const geocoder = new google.maps.Geocoder();
        const latlng = new google.maps.LatLng(location.lat, location.lng);
        
        geocoder.geocode({ 'location': latlng }, (results: any, status: any) => {
          this.zone.run(() => {
            if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
              // Actualizamos el nombre con la información más relevante
              const result = results[0];
              
              // Intentar obtener el nombre del punto de interés
              const poiComponent = result.address_components.find(
                (component: any) => component.types.includes('point_of_interest')
              );
              
              if (poiComponent) {
                waypoint.name = poiComponent.long_name;
              } else {
                // Usar la dirección formateada, pero limitarla para mayor legibilidad
                const addressParts = result.formatted_address.split(',');
                if (addressParts.length > 2) {
                  // Tomamos las primeras dos partes (generalmente calle y barrio/zona)
                  waypoint.name = addressParts.slice(0, 2).join(', ');
                } else {
                  waypoint.name = result.formatted_address;
                }
              }
              
              // También guardamos la dirección completa
              waypoint.address = result.formatted_address;
              
              // Actualizamos la referencia en el array
              const index = this.waypoints.findIndex(wp => wp.location === waypoint.location);
              if (index !== -1) {
                this.waypoints[index] = waypoint;
              }
            }
            
            resolve(waypoint);
          });
        });
      } catch (error) {
        console.error('Error en geocodificación inversa:', error);
        resolve(waypoint); // Resolvemos con el waypoint básico en caso de error
      }
    });
  }

  /**
   * Actualiza la ruta en el mapa utilizando los waypoints actuales.
   * 
   * @remarks
   * Este método verifica que haya al menos dos waypoints antes de intentar calcular la ruta.
   * Si hay menos de dos, no se realiza ninguna acción.
   */
  updateRoute(): void {
    if (this.waypoints.length < 2) return;

    const origin = this.waypoints[0].location;
    const destination = this.waypoints[this.waypoints.length - 1].location;
    
    // Asegurarnos de que cada waypoint intermedio tenga el formato correcto
    const intermediateWaypoints = this.waypoints.slice(1, -1).map(wp => ({
      location: wp.location,
      stopover: wp.stopover
    }));

    this.directionsService.route(
      {
        origin,
        destination,
        waypoints: intermediateWaypoints,   // Formateado correctamente
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false  // No optimizar para mantener el orden exacto
      },
      (result: any, status: any) => {
        if (status === google.maps.DirectionsStatus.OK) {
          this.directionsRenderer.setDirections(result);
          console.log('Ruta actualizada con éxito:', this.waypoints.length, 'destinos');
        } else {
          console.error('Error al calcular la ruta:', status);
        }
      }
    );
  }

  /**
   * Devuelve la lista de waypoints actuales.
   * 
   * @returns Un array de objetos Waypoint que representan los waypoints actuales.
   */
  getWaypoints(): Waypoint[] {
    return [...this.waypoints];
  }

  /**
   * Elimina todos los waypoints y limpia la ruta en el mapa.
   * 
   * @remarks
   * Este método restablece la lista de waypoints a un array vacío y elimina la ruta actual del mapa.
   */
  clearWaypoints(): void {
    this.waypoints = [];
    if (this.directionsRenderer) {
      this.directionsRenderer.setDirections({ routes: [] });
    }
  }

  /**
   * Genera una URL de Google Maps para la ruta actual.
   * 
   * @returns Una cadena que representa la URL de Google Maps con la ruta actual, o null si no hay waypoints.
   */
  generateGoogleMapsUrl(): string | null {
    if (this.waypoints.length === 0) {
      return null;
    }

    const baseUrl = 'https://www.google.com/maps/dir/?api=1';
    const origin = encodeURIComponent(this.waypoints[0].location);
    const destination = encodeURIComponent(this.waypoints[this.waypoints.length - 1].location);
    
    let url = `${baseUrl}&origin=${origin}&destination=${destination}`;
    
    // Añadir waypoints intermedios si existen
    if (this.waypoints.length > 2) {
      const waypointsParam = this.waypoints
        .slice(1, -1)
        .map(wp => encodeURIComponent(wp.location))
        .join('|');
      
      if (waypointsParam) {
        url += `&waypoints=${waypointsParam}`;
      }
    }
    
    return url;
  }

  /**
   * Genera una URL para una imagen estática del mapa con la ruta actual.
   * 
   * @param width - Ancho de la imagen en píxeles (por defecto: 600).
   * @param height - Alto de la imagen en píxeles (por defecto: 400).
   * @returns Una cadena que representa la URL de la imagen estática del mapa, o null si no hay waypoints.
   */
  generateStaticMapImageUrl(width: number = 600, height: number = 400): string | null {
    if (this.waypoints.length === 0) {
      return null;
    }

    const staticMapBaseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    const markers = this.waypoints.map((wp, index) => {
      // Usar el nombre del lugar si está disponible para mejorar la legibilidad
      const label = String.fromCharCode(65 + index);
      return `markers=label:${label}|${wp.location}`;
    }).join('&');
    
    const path = `path=color:0x0000ff|weight:5|${this.waypoints.map(wp => wp.location).join('|')}`;

    return `${staticMapBaseUrl}?size=${width}x${height}&maptype=roadmap&${markers}&${path}&key=${apiKey}`;
  }
}