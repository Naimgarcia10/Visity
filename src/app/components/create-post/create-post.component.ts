import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GoogleMapsService, Waypoint } from '../../shared/maps.service';
import { PostService } from '../../shared/post.service';
import { FileToUrlPipe } from '../../shared/global.service';
import { FireStorageMngService } from '../../shared/fire-storage-mng.service';

@Component({
  selector: 'app-create-post',
  templateUrl: './create-post.component.html',
  styleUrls: ['./create-post.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FileToUrlPipe],
  host: { 'ngSkipHydration': '' }
})
export class CreatePostComponent implements OnInit {
  private fireStorage: FireStorageMngService = inject(FireStorageMngService);
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
  currentImageIndex: number = 0;
  @Output() onPostCreated = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private mapsService: GoogleMapsService,
    private postService: PostService,
    private router: Router,
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

  /**
   * Método del ciclo de vida de Angular que se ejecuta al inicializar el componente.
   * 
   * - Verifica si el entorno actual es del servidor para evitar la inicialización del mapa en ese caso.
   * - Carga el script de Google Maps de manera asíncrona y, una vez cargado, inicializa el mapa y la barra de búsqueda.
   * - Se suscribe a los cambios en los waypoints para actualizar el formulario correspondiente.
   * 
   * @returns {void}
   */
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

  /**
   * Finaliza el itinerario actual realizando las siguientes acciones:
   * - Obtiene los puntos de referencia (waypoints) desde el servicio de mapas.
   * - Limpia la caja de búsqueda del servicio de mapas.
   *
   * @returns {void} No devuelve ningún valor.
   */
  finalizarItinerario(): void {
    this.waypoints = this.mapsService.getWaypoints();
    this.mapsService.clearSearchBox(); 
  }

  /**
   * Finaliza el itinerario actual y genera una imagen representativa del mismo.
   * 
   * Este método realiza las siguientes acciones:
   * 1. Obtiene los puntos de referencia (waypoints) del itinerario desde el servicio de mapas.
   * 2. Verifica si hay destinos en el itinerario. Si no hay, muestra un mensaje al usuario y detiene la ejecución.
   * 3. Genera una URL de Google Maps basada en los puntos de referencia del itinerario.
   * 4. Genera una URL de una imagen estática del mapa que representa el itinerario.
   * 5. Marca el itinerario como finalizado.
   * 
   * @returns {void} No retorna ningún valor.
   */
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

  /**
   * Muestra un mensaje de estado temporal en la interfaz de usuario.
   *
   * @param mensaje - El mensaje que se mostrará al usuario.
   * @param duracion - La duración en milisegundos durante la cual el mensaje será visible. 
   *                    Por defecto es 3000 ms (3 segundos).
   */
  mostrarMensaje(mensaje: string, duracion: number = 3000): void {
    this.statusMessage = mensaje;
    this.showStatusMessage = true;
    setTimeout(() => {
      this.showStatusMessage = false;
    }, duracion);
  }

  /**
   * Maneja el evento de cambio de estado de un checkbox y actualiza el FormArray correspondiente
   * en el formulario reactivo.
   *
   * @param category - El nombre de la categoría asociada al FormArray en el formulario.
   * @param event - El evento que contiene información sobre el estado del checkbox.
   *
   * - Si el checkbox está marcado (`event.target.checked` es `true`), se agrega un nuevo
   *   FormControl con el valor del checkbox al FormArray.
   * - Si el checkbox está desmarcado, se busca el índice del FormControl correspondiente
   *   en el FormArray y se elimina.
   */
  onCheckboxChange(category: string, event: any): void {
    const formArray: FormArray = this.postForm.get(category) as FormArray;
    if (event.target.checked) {
      formArray.push(new FormControl(event.target.value));
    } else {
      const index = formArray.controls.findIndex(ctrl => ctrl.value === event.target.value);
      formArray.removeAt(index);
    }
  }

  /**
   * Maneja el evento de cambio en un botón de opción (radio button).
   * 
   * @param category - La categoría asociada al botón de opción (por ejemplo, 'presupuesto' o 'clima').
   * @param value - El valor seleccionado del botón de opción.
   * 
   * Este método realiza las siguientes acciones:
   * - Actualiza el valor correspondiente en el `FormGroup` asociado al formulario.
   * - Ajusta el estado `selected` de los objetos en el arreglo `tags` para reflejar la selección actual.
   * - Actualiza las propiedades `selectedPresupuesto` o `selectedClima` según la categoría seleccionada.
   */
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

  /**
   * Obtiene una lista de etiquetas seleccionadas basadas en los valores del formulario y las selecciones actuales.
   *
   * @returns {string[]} Un arreglo de cadenas que representa las etiquetas seleccionadas. 
   *                     Se excluyen las etiquetas vacías.
   */
  getSelectedTags(): string[] {
    return [
      ...this.postForm.get('tipoViaje')?.value || [],
      this.selectedPresupuesto || '',
      this.selectedClima || ''
    ].filter(tag => tag !== '');
  }

 onImageUpload(event: any): void {
  const files = Array.from(event.target.files || []) as File[];

  const combinedFiles = [...this.imageFiles, ...files];
  const uniqueFiles = combinedFiles.filter(
    (file, index, self) =>
      index === self.findIndex(f => f.name === file.name && f.size === file.size)
  );

  if (uniqueFiles.length > 10) {
    this.mostrarMensaje('Solo puedes subir hasta 10 imágenes');
    return;
  }

  this.imageFiles = uniqueFiles;
  this.imageFile = this.imageFiles[0];

  const reader = new FileReader();
  reader.onload = () => this.imageUrl = reader.result as string;
  if (this.imageFile) reader.readAsDataURL(this.imageFile);

  if (this.imageFiles.length > 1) {
    this.mostrarMensaje(`Se han seleccionado ${this.imageFiles.length} imágenes`);
  }
}

  async submitPost(): Promise<void> {
    if (!this.postForm.valid || this.isSubmitting) return;
    this.isSubmitting = true;

    try {
      const content = this.postForm.get('text')?.value;
      const tipoViaje = this.postForm.get('tipoViaje')?.value || [];
      const presupuesto = this.selectedPresupuesto || '';
      const clima = this.selectedClima || '';


      this.showStatusMessage = true;
      this.statusMessage = 'Subiendo imágenes...';

      // Subir imágenes al storage y obtener sus URLs
      const imageUploadPromises = this.imageFiles.map(file =>
        this.fireStorage.uploadFile(file, 'posts')
      );
      const imageURLs = await Promise.all(imageUploadPromises);

      // Si hay imagen del itinerario, subirla también
      if (this.itinerarioImagenUrl) {
        const response = await fetch(this.itinerarioImagenUrl);
        const blob = await response.blob();
        const itineraryFile = new File([blob], 'itinerary.png', { type: 'image/png' });
        const itineraryURL = await this.fireStorage.uploadFile(itineraryFile, 'posts');
        imageURLs.push(itineraryURL);
      }

      this.statusMessage = 'Publicando post...';

      await this.postService.createPost(
        content,
        imageURLs,
        this.googleMapsUrl || '',
        tipoViaje,
        presupuesto,
        clima
      );

      this.statusMessage = '¡Post publicado!';
      this.resetFormAndStates();
      setTimeout(() => {
        this.onPostCreated.emit(); 
      }, 2000);
    } catch (error) {
      this.mostrarMensaje('Error al publicar el post');
      console.error(error);
    } finally {
      this.isSubmitting = false;
      setTimeout(() => this.showStatusMessage = false, 3000);
    }
  }


/**
 * Restablece el formulario y los estados asociados en el componente.
 * 
 * Este método realiza las siguientes acciones:
 * - Reinicia el formulario `postForm`.
 * - Deselecciona todas las etiquetas de los arrays `tipoViaje`, `presupuesto` y `clima`.
 * - Restablece las variables relacionadas con imágenes (`imageUrl`, `imageFile`, `imageFiles`).
 * - Limpia los puntos de ruta (`waypoints`) y reinicia el estado del itinerario.
 * - Deselecciona los checkboxes y radios asociados a las etiquetas en el DOM.
 * - Limpia el valor del input de imagen.
 * - Limpia el mapa utilizando los servicios de `mapsService`.
 * - Re-inicializa el componente llamando a `ngOnInit`.
 * 
 * Este método es útil para reiniciar el estado del componente a su estado inicial,
 * por ejemplo, después de crear un post o al cancelar una operación.
 */
 resetFormAndStates(): void {
    this.postForm.reset();
    this.selectedPresupuesto = null;
    this.selectedClima = null;
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

    this.tags.tipoViaje.forEach(tag => {
      const travelTypeCheckbox = document.getElementById('tipo-' + tag.label) as HTMLInputElement;
      if (travelTypeCheckbox) {
        travelTypeCheckbox.checked = false;
      }
    });
    
    this.tags.presupuesto.forEach(tag => {
      const presupuestoRadio = document.getElementById('presupuesto-' + tag.label) as HTMLInputElement;
      if (presupuestoRadio) {
        presupuestoRadio.checked = false;
      }
    });
    
    this.tags.clima.forEach(tag => {
      const climaRadio = document.getElementById('clima-' + tag.label) as HTMLInputElement;
      if (climaRadio) {
        climaRadio.checked = false;
      }
    });

    const inputImage = document.getElementById('image');
    if (inputImage) {
      (inputImage as HTMLInputElement).value = ''; // Limpiar el input de imagen
    }

    // Limpiar el mapa
    this.mapsService.clearWaypoints();
    this.mapsService.clearSearchBox();
    this.ngOnInit(); // Re-inicializar el mapa
  }

  nextImage() {
    if (this.imageFiles && this.currentImageIndex < this.imageFiles.length - 1) {
      this.currentImageIndex++;
    }
  }

  prevImage() {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    }
  }
}