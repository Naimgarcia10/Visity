import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GoogleMapsService, Waypoint } from '../../shared/maps-service';
import { PostService } from '../../shared/post-service'; // Importar el servicio

@Component({
  selector: 'app-create-post',
  templateUrl: './create-post.component.html',
  styleUrls: ['./create-post.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  host: { 'ngSkipHydration': '' }
})
export class CreatePostComponent implements OnInit {
  postForm: FormGroup;
  isSubmitting = false;
  imageFile: File | null = null;
  selectedPresupuesto: string | null = null;
  selectedClima: string | null = null;

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
  waypoints: Waypoint[] = [];
  itinerarioFinalizado: boolean = false;
  itinerarioImagenUrl: string | null = null;
  googleMapsUrl: string | null = null;
  statusMessage: string = '';
  showStatusMessage: boolean = false;
  imageFiles: File[] = [];

  constructor(
    private fb: FormBuilder,
    private mapsService: GoogleMapsService,
    private postService: PostService,
    private router: Router
  ) {
    this.postForm = this.fb.group({
      text: ['', [Validators.required, Validators.maxLength(500)]],
      image: [''],
      tipoViaje: this.fb.array([]),
      presupuesto: [''],
      clima: [''],
      itinerary: [[]]
    });
  }

  ngOnInit(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.warn('El entorno actual es del servidor. El mapa no se inicializará.');
      return;
    }

    this.mapsService.loadGoogleMapsScript().then(() => {
      // Inicializar el mapa después de cargar la API
      setTimeout(() => {
        const mapElement = document.getElementById('map');
        if (mapElement) {
          this.mapsService.initMap(mapElement);
          
          const searchBar = document.getElementById('search-bar') as HTMLInputElement;
          if (searchBar) {
            this.mapsService.initSearchBox(searchBar);
          }
        }
      }, 500);
    }).catch(error => {
      console.error('Error al cargar Google Maps:', error);
    });

    // Suscribirse para recibir actualizaciones de waypoints
    this.mapsService.isMapInitialized().subscribe(initialized => {
      if (initialized) {
        // Actualizar el formulario cuando cambian los waypoints
        this.waypoints = this.mapsService.getWaypoints();
        this.postForm.get('itinerary')?.setValue(this.waypoints);
      }
    });
  }

  finalizarItinerario(): void {
    this.waypoints = this.mapsService.getWaypoints();
  }

  finalizarItinerarioYGenerarImagen(): void {
    this.waypoints = this.mapsService.getWaypoints();
    
    if (this.waypoints.length === 0) {
      this.mostrarMensaje('No hay destinos en el itinerario.');
      return;
    }

    // Generar URL de Google Maps
    this.googleMapsUrl = this.mapsService.generateGoogleMapsUrl();

    // Generar imagen del itinerario
    this.itinerarioImagenUrl = this.mapsService.generateStaticMapImageUrl();
    this.itinerarioFinalizado = true;
  }

  mostrarMensaje(mensaje: string, duracion: number = 3000): void {
    this.statusMessage = mensaje;
    this.showStatusMessage = true;
    setTimeout(() => {
      this.showStatusMessage = false;
    }, duracion);
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

  onRadioChange(category: string, value: string): void {
    // Actualizar el valor en el FormGroup
    this.postForm.get(category)?.setValue(value);
    
    // Actualizar el estado selected en el objeto tags
    if (category === 'presupuesto') {
      this.tags.presupuesto.forEach(tag => tag.selected = false);
      const tagIndex = this.tags.presupuesto.findIndex(tag => tag.label === value);
      if (tagIndex !== -1) {
        this.tags.presupuesto[tagIndex].selected = true;
      }
      this.selectedPresupuesto = value;
    } else if (category === 'clima') {
      this.tags.clima.forEach(tag => tag.selected = false);
      const tagIndex = this.tags.clima.findIndex(tag => tag.label === value);
      if (tagIndex !== -1) {
        this.tags.clima[tagIndex].selected = true;
      }
      this.selectedClima = value;
    }
  }

  getSelectedTags(): string[] {
    return [
      ...this.postForm.get('tipoViaje')?.value || [],
      this.selectedPresupuesto || '',
      this.selectedClima || ''
    ].filter(tag => tag !== '');
  }

  onImageUpload(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Limitar a 10 imágenes
      if (files.length > 10) {
        this.mostrarMensaje('Solo puedes subir hasta 10 imágenes');
        return;
      }
      
      // Guardar todos los archivos seleccionados
      this.imageFiles = Array.from(files);
      
      // Usar la primera imagen como vista previa
      this.imageFile = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.imageUrl = reader.result as string;
      };
      if (this.imageFile) {
        reader.readAsDataURL(this.imageFile);
      }
      
      // Mostrar mensaje informativo
      if (files.length > 1) {
        this.mostrarMensaje(`Se han seleccionado ${files.length} imágenes`);
      }
    }
  }

  async submitPost(): Promise<void> {
    if (this.postForm.valid) {
      try {
        this.isSubmitting = true;
        this.statusMessage = 'Publicando...';
        this.showStatusMessage = true;
        
        // Obtener los valores del formulario
        const content = this.postForm.get('text')?.value;
        const tipoViaje = this.postForm.get('tipoViaje')?.value || [];
        const presupuesto = this.selectedPresupuesto || '';
        const clima = this.selectedClima || '';
        
        // Crear un array con todas las imágenes (incluida la del itinerario si existe)
        const imagesToUpload: File[] = [...this.imageFiles];
        
        // Convertir la imagen del itinerario a File si existe
        if (this.itinerarioImagenUrl) {
          try {
            const response = await fetch(this.itinerarioImagenUrl);
            const blob = await response.blob();
            const itineraryFile = new File([blob], 'itinerary.png', { type: 'image/png' });
            imagesToUpload.push(itineraryFile);
          } catch (error) {
            console.error('Error al convertir la imagen del itinerario:', error);
          }
        }
        
        // Usar el servicio para crear el post
        const postId = await this.postService.createPost(
          content,
          imagesToUpload,
          this.googleMapsUrl || '',
          tipoViaje,
          presupuesto,
          clima
        );
        
        console.log('Post creado con ID:', postId);
        this.mostrarMensaje('¡Post publicado con éxito!', 2000);
        
        // Resetear el formulario y los estados
        this.resetFormAndStates();
        
        // Redirigir a la página principal
        setTimeout(() => {
          this.router.navigate(['/feed']);
        }, 2000);
      } catch (error) {
        console.error('Error al crear el post:', error);
        this.mostrarMensaje('Error al publicar el post. Por favor, inténtalo de nuevo.', 3000);
      } finally {
        this.isSubmitting = false;
      }
    }
  }
  
  // Método para resetear el formulario y todos los estados
  private resetFormAndStates(): void {
    this.postForm.reset();
    this.tags.tipoViaje.forEach(tag => (tag.selected = false));
    this.tags.presupuesto.forEach(tag => (tag.selected = false));
    this.tags.clima.forEach(tag => (tag.selected = false));
    this.imageUrl = null;
    this.imageFile = null;
    this.imageFiles = [];
    this.waypoints = [];
    this.itinerarioFinalizado = false;
    this.itinerarioImagenUrl = null;
    this.googleMapsUrl = null;
    
    // Limpiar el mapa
    this.mapsService.clearWaypoints();
  }
}