import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule, FormArray, FormControl } from '@angular/forms';
import { of } from 'rxjs';
import { CreatePostComponent } from './create-post.component';
import { FileToUrlPipe } from '../../shared/global.service';
import { Waypoint, GoogleMapsService } from '../../shared/maps.service';
import { PostService } from '../../shared/post.service';
import { FireStorageMngService } from '../../shared/fire-storage-mng.service';
import { Router } from '@angular/router';

// Mocks
const mockMapsService = {
  loadGoogleMapsScript: () => Promise.resolve(),
  isMapInitialized: () => of(true),
  getWaypoints: (): Waypoint[] => [],
  clearSearchBox: jasmine.createSpy(),
  clearWaypoints: jasmine.createSpy(),
  initMap: jasmine.createSpy(),
  initSearchBox: jasmine.createSpy(),
  generateGoogleMapsUrl: () => 'https://maps.google.com',
  generateStaticMapImageUrl: () => 'https://static.map.url'
};

const mockPostService = {
  createPost: jasmine.createSpy().and.returnValue(Promise.resolve())
};

const mockFireStorage = {
  uploadFile: jasmine.createSpy().and.callFake(() => Promise.resolve('https://fake-image.url'))
};

const mockRouter = {
  navigate: jasmine.createSpy()
};

describe('CreatePostComponent', () => {
  let component: CreatePostComponent;
  let fixture: ComponentFixture<CreatePostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, FormsModule],
      providers: [
        { provide: GoogleMapsService, useValue: mockMapsService },
        { provide: PostService, useValue: mockPostService },
        { provide: FireStorageMngService, useValue: mockFireStorage },
        { provide: Router, useValue: mockRouter }
      ]
    })
    .overrideComponent(CreatePostComponent, {
      set: {
        providers: [
          { provide: GoogleMapsService, useValue: mockMapsService },
          { provide: PostService, useValue: mockPostService },
          { provide: FireStorageMngService, useValue: mockFireStorage },
          { provide: Router, useValue: mockRouter }
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatePostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debería invalidar el formulario si el campo texto está vacío', () => {
    component.postForm.get('text')?.setValue('');
    expect(component.postForm.invalid).toBeTrue();
  });

  it('debería marcar el campo "text" como inválido si supera los 500 caracteres', () => {
    const longText = 'a'.repeat(501);
    component.postForm.get('text')?.setValue(longText);
    expect(component.postForm.get('text')?.valid).toBeFalse();
  });

  it('debería actualizar el FormArray al marcar un tipo de viaje', () => {
    const event = { target: { value: 'Aventura', checked: true } };
    component.onCheckboxChange('tipoViaje', event);
    const tipoViajeArray = component.postForm.get('tipoViaje') as any;
    expect(tipoViajeArray.value).toContain('Aventura');
  });

  it('debería actualizar el campo "presupuesto" al marcar un radio', () => {
    component.onRadioChange('presupuesto', 'Medio (500€ - 1500€)');
    expect(component.postForm.get('presupuesto')?.value).toBe('Medio (500€ - 1500€)');
    expect(component.selectedPresupuesto).toBe('Medio (500€ - 1500€)');
  });

  it('debería emitir el evento onPostCreated tras crear un post', fakeAsync(async () => {
    const spy = spyOn(component.onPostCreated, 'emit');
    component.postForm.get('text')?.setValue('Texto válido');
    const tipoViajeArray = component.postForm.get('tipoViaje') as FormArray;
    tipoViajeArray.push(new FormControl('Mochilero'));
    component.selectedPresupuesto = 'Económico (<500€)';
    component.selectedClima = 'Cálido (playa, trópico)';
    component.imageFiles = [new File([''], 'foto1.jpg')];

    await component.submitPost();
    tick(2000);

    expect(spy).toHaveBeenCalled();
    expect(mockPostService.createPost).toHaveBeenCalled();
  }));

  it('resetFormAndStates() debe reiniciar todos los campos del formulario', () => {
    component.postForm.get('text')?.setValue('test');
    component.selectedClima = 'Frío';
    component.selectedPresupuesto = 'Costoso';
    component.imageFiles = [new File([''], 'foto1.jpg')];
    component.itinerarioFinalizado = true;
    component.googleMapsUrl = 'https://maps.google.com';

    component.resetFormAndStates();

    expect(component.postForm.get('text')?.value).toBeNull();
    expect(component.selectedClima).toBeNull();
    expect(component.imageFiles.length).toBe(0);
    expect(component.itinerarioFinalizado).toBeFalse();
    expect(component.googleMapsUrl).toBeNull();
  });

  it('finalizarItinerarioYGenerarImagen() debe mostrar mensaje si no hay destinos', () => {
    spyOn(component, 'mostrarMensaje');
    spyOn(mockMapsService, 'getWaypoints').and.returnValue([]);

    component.finalizarItinerarioYGenerarImagen();

    expect(component.mostrarMensaje).toHaveBeenCalledWith('No hay destinos en el itinerario.');
    expect(component.itinerarioFinalizado).toBeFalse();
  });

  it('finalizarItinerarioYGenerarImagen() debe generar URL e imagen si hay destinos', () => {
    const fakeWaypoints: Waypoint[] = [
      { name: 'París', location: 'París', stopover: true }
    ];

    spyOn(mockMapsService, 'getWaypoints').and.returnValue(fakeWaypoints);
    spyOn(mockMapsService, 'generateGoogleMapsUrl').and.returnValue('https://maps.fake');
    spyOn(mockMapsService, 'generateStaticMapImageUrl').and.returnValue('https://static.fake');

    component.finalizarItinerarioYGenerarImagen();

    expect(component.googleMapsUrl).toBe('https://maps.fake');
    expect(component.itinerarioImagenUrl).toBe('https://static.fake');
    expect(component.itinerarioFinalizado).toBeTrue();
  });
});
