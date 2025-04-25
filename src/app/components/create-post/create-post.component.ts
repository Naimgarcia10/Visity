import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';

declare const google: any; // Declaración para usar el objeto global de Google Maps

@Component({
  selector: 'app-create-post',
  templateUrl: './create-post.component.html',
  styleUrls: ['./create-post.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  host: { 'ngSkipHydration': '' } // Evitar problemas de hidratación
})
export class CreatePostComponent implements OnInit {
  postForm: FormGroup;
  tags = {
    tipoViaje: [
      { label: 'Mochilero', selected: false },
      { label: 'Aventura', selected: false },
      { label: 'Cultural', selected: false },
      { label: 'Gastronómico', selected: false }
    ],
    presupuesto: [
      { label: 'Económico (<500€)', selected: false },
      { label: 'Medio (500€ - 1500€)', selected: false },
      { label: 'Costoso (>1500€)', selected: false }
    ],
    clima: [
      { label: 'Cálido (playa, trópico)', selected: false },
      { label: 'Templado (primavera, otoño)', selected: false },
      { label: 'Frío (nieve, montaña)', selected: false },
      { label: 'Variable', selected: false }
    ]
  };
  imageUrl: string | null = null;
  map: any;
  directionsService: any;
  directionsRenderer: any;
  waypoints: { location: string; stopover: boolean }[] = [];
  searchBox: any;
  itinerarioFinalizado: boolean = false;
  itinerarioImagenUrl: string | null = null;
  googleMapsUrl: string | null = null;

  constructor(private fb: FormBuilder) {
    this.postForm = this.fb.group({
      text: ['', [Validators.required, Validators.maxLength(500)]],
      image: [''],
      tipoViaje: this.fb.array([]),
      presupuesto: this.fb.array([]),
      clima: this.fb.array([]),
      itinerary: [[]] // Campo para almacenar el itinerario
    });
  }

  ngOnInit(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.warn('El entorno actual es del servidor. El mapa no se inicializará.');
      return;
    }

    this.loadGoogleMapsScript().then(() => {
      this.initMap();
      this.initSearchBox();
    }).catch(error => {
      console.error('Error al cargar Google Maps:', error);
    });
  }

  private loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        reject(new Error('El entorno no es compatible con el navegador.'));
        return;
      }

      if (typeof google !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBAQcrgc23ELlI5I8xhIQ2WWY4KP7BrKX8&libraries=places';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (error) => reject(error);
      document.head.appendChild(script);
    });
  }

  initMap(): void {
    this.map = new google.maps.Map(document.getElementById('map') as HTMLElement, {
      center: { lat: 34.0522, lng: -118.2437 }, // Coordenadas iniciales (Los Ángeles)
      zoom: 8
    });

    this.directionsService = new google.maps.DirectionsService();
    this.directionsRenderer = new google.maps.DirectionsRenderer();
    this.directionsRenderer.setMap(this.map);

    this.map.addListener('click', (event: any) => {
      const location = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      this.addWaypoint(location);
    });
  }

  initSearchBox(): void {
    const input = document.getElementById('search-bar') as HTMLInputElement;
    this.searchBox = new google.maps.places.SearchBox(input);

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

  addWaypoint(location: { lat: number; lng: number }): void {
    this.waypoints.push({ location: `${location.lat},${location.lng}`, stopover: true });
    this.updateRoute();
  }

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
          this.postForm.get('itinerary')?.setValue(this.waypoints);
        } else {
          console.error('Error al calcular la ruta:', status);
        }
      }
    );
  }

  finalizarItinerario(): void {
    this.itinerarioFinalizado = true;
  }

  finalizarItinerarioYGenerarImagen(): void {
    if (this.waypoints.length === 0) {
      console.warn('No hay destinos en el itinerario.');
      return;
    }

    // Generar URL de Google Maps
    const baseUrl = 'https://www.google.com/maps/dir/?api=1';
    const origin = this.waypoints[0].location;
    const destination = this.waypoints[this.waypoints.length - 1].location;
    const waypoints = this.waypoints.slice(1, -1).map(wp => wp.location).join('|');

    this.googleMapsUrl = `${baseUrl}&origin=${origin}&destination=${destination}&waypoints=${waypoints}`;

    // Generar imagen del itinerario con Google Maps Static API
    const staticMapBaseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    const markers = this.waypoints.map((wp, index) => `markers=label:${String.fromCharCode(65 + index)}|${wp.location}`).join('&');
    const path = `path=color:0x0000ff|weight:5|${this.waypoints.map(wp => wp.location).join('|')}`;

    this.itinerarioImagenUrl = `${staticMapBaseUrl}?size=600x400&maptype=roadmap&${markers}&${path}&key=AIzaSyBAQcrgc23ELlI5I8xhIQ2WWY4KP7BrKX8`;
  }

  onCheckboxChange(category: string, event: any): void {
    const formArray: FormArray = this.postForm.get(category) as FormArray;
    if (event.target.checked) {
      formArray.push(new FormControl(event.target.value));
    } else {
      const index = formArray.controls.findIndex(ctrl => ctrl.value === event.target.value);
      formArray.removeAt(index);
    }
  }

  getSelectedTags(): string[] {
    return [
      ...this.postForm.get('tipoViaje')?.value,
      ...this.postForm.get('presupuesto')?.value,
      ...this.postForm.get('clima')?.value
    ];
  }

  onImageUpload(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imageUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  submitPost(): void {
    if (this.postForm.valid) {
      const postData = {
        text: this.postForm.get('text')?.value,
        tags: this.getSelectedTags(),
        image: this.imageUrl,
        itinerary: this.postForm.get('itinerary')?.value
      };
      console.log('Post creado:', postData);
      this.postForm.reset();
      this.tags.tipoViaje.forEach(tag => (tag.selected = false));
      this.tags.presupuesto.forEach(tag => (tag.selected = false));
      this.tags.clima.forEach(tag => (tag.selected = false));
      this.imageUrl = null;
      this.waypoints = [];
      this.directionsRenderer.setDirections({ routes: [] });
    }
  }
}