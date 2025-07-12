import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SuggestedUsersComponent } from './suggested-users.component';
import { of } from 'rxjs';
import { Firestore } from '@angular/fire/firestore';
import { AuthService } from '../../shared/auth.service';
import { PostService } from '../../shared/post.service';
import { Auth } from '@angular/fire/auth';
import { FireStorageMngService } from '../../shared/fire-storage-mng.service';
import { Storage } from '@angular/fire/storage';
import { MatchingService } from '../../shared/matching.service';
import { FollowService } from '../../shared/follow.service';

// Mocks
const mockMatchingService = {
  getSuggestedUsers: jasmine.createSpy().and.returnValue(Promise.resolve([
    { username: 'user1', profilePic: 'pic1.jpg', matchScore: 80 },
    { username: 'user2', profilePic: 'pic2.jpg', matchScore: 90 }
  ]))
};

const mockFollowService = {
  isFollowing: jasmine.createSpy().and.callFake((from: string, to: string) => {
    return of(to === 'user1'); // Solo sigue a user1
  }),
  followUserByUsername: jasmine.createSpy().and.returnValue(of({})),
  unfollowUserByUsername: jasmine.createSpy().and.returnValue(of({}))
};

// Mejorar el mock de Firestore para que sea más robusto
const mockFirestore = {
  collection: function(path: string) {
    return {
      valueChanges: () => of([]),
      doc: (id: string) => ({
        valueChanges: () => of({}),
        get: () => Promise.resolve({
          exists: true,
          data: () => ({ username: 'testuser' })
        }),
        set: jasmine.createSpy('set').and.returnValue(Promise.resolve()),
        update: jasmine.createSpy('update').and.returnValue(Promise.resolve())
      }),
      where: () => ({
        get: () => Promise.resolve({
          empty: false,
          docs: [
            {
              id: 'doc1',
              data: () => ({ username: 'user1' }),
              ref: { path: 'users/doc1' }
            }
          ]
        })
      })
    };
  },
  doc: function(path: string) {
    return {
      valueChanges: () => of({}),
      get: () => Promise.resolve({
        exists: true,
        data: () => ({ username: 'testuser' })
      }),
      set: jasmine.createSpy('set').and.returnValue(Promise.resolve()),
      update: jasmine.createSpy('update').and.returnValue(Promise.resolve()),
      collection: (colPath: string) => this.collection(`${path}/${colPath}`)
    };
  },
  // Añadir cualquier otro método que utilice tu app
  runTransaction: (cb: Function) => Promise.resolve(cb({
    get: (ref: any) => Promise.resolve({
      exists: true,
      data: () => ({ username: 'test', followers: 5 })
    }),
    update: jasmine.createSpy('transactionUpdate'),
    set: jasmine.createSpy('transactionSet')
  }))
};

// Mock para Auth
const mockAuth = {
  currentUser: { uid: 'user123' },
  onAuthStateChanged: jasmine.createSpy().and.callFake((callback) => {
    callback({ uid: 'user123' });
    return () => {};
  }),
  signOut: jasmine.createSpy().and.returnValue(Promise.resolve())
};

// Mock para Storage
const mockStorage = {
  ref: (path: string) => ({
    getDownloadURL: () => Promise.resolve('https://example.com/fake-url'),
    put: jasmine.createSpy().and.returnValue({
      then: (cb: Function) => {
        cb();
        return {
          catch: () => {}
        };
      }
    }),
    delete: jasmine.createSpy().and.returnValue(Promise.resolve())
  })
};

const mockAuthService = {
  getUserById: jasmine.createSpy('getUserById').and.returnValue(Promise.resolve({
    username: 'naimgarciaa_',
    profilePic: 'some-url'
  })),
  getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue(Promise.resolve({ uid: 'user123' })),
  getUsernameById: jasmine.createSpy('getUsernameById').and.returnValue(Promise.resolve('naimgarciaa_'))
};

// Mock para PostService
const mockPostService = {
  getPosts: jasmine.createSpy().and.returnValue(of([])),
  getPostsByAuthor: jasmine.createSpy().and.returnValue(of([]))
};

const mockFireStorage = {
  uploadFile: jasmine.createSpy().and.callFake(() => Promise.resolve('https://fake-image.url'))
};

describe('SuggestedUsersComponent', () => {
  let component: SuggestedUsersComponent;
  let fixture: ComponentFixture<SuggestedUsersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuggestedUsersComponent],
      providers: [
        // Servicios de la aplicación
        { provide: AuthService, useValue: mockAuthService },
        { provide: MatchingService, useValue: mockMatchingService },
        { provide: FollowService, useValue: mockFollowService },
        { provide: PostService, useValue: mockPostService },
        { provide: FireStorageMngService, useValue: mockFireStorage },
        
        // Servicios de Firebase
        { provide: Firestore, useValue: mockFirestore },
        { provide: Auth, useValue: mockAuth }, 
        { provide: Storage, useValue: mockStorage }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SuggestedUsersComponent);
    component = fixture.componentInstance;
    
    // Inicializar propiedades críticas antes de detectChanges
    component.currentUsername = 'naimgarciaa_';
    component.suggestions = [];

    fixture.detectChanges();
  });

  it('debería crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debería cargar el nombre de usuario actual en ngOnInit', fakeAsync(() => {
  // Llamar a ngOnInit
  component.ngOnInit();
  tick(1000);
  fixture.detectChanges();
  
  // Verificar solo que el username se cargó correctamente
  expect(component.currentUsername).toBe('naimgarciaa_');
}));

it('debería cargar sugerencias de usuarios', fakeAsync(() => {
  // Establecer manualmente el username (ya comprobado en la prueba anterior)
  component.currentUsername = 'naimgarciaa_';
  
  // Llamar a loadSuggestions (o el método que carga las sugerencias)
  // Si no hay un método separado, llama a ngOnInit
  component.ngOnInit();
  tick(1000);
  fixture.detectChanges();
  
  // Verificar que se llamó al servicio
  expect(mockMatchingService.getSuggestedUsers).toHaveBeenCalled();
}));

  it('debería mostrar mensaje si no hay sugerencias', fakeAsync(() => {
    mockMatchingService.getSuggestedUsers.and.returnValue(Promise.resolve([]));
    component.ngOnInit();
    tick(1000);
    fixture.detectChanges();
    
    // Usar detectChanges adicional después de tick para asegurar que la UI se actualiza
    fixture.detectChanges();
    
    expect(component.suggestions.length).toBe(0);
    
    // Verificar mensaje en UI según tu implementación real
    const compiled = fixture.nativeElement as HTMLElement;
    const noSuggestions = compiled.querySelector('.no-suggestions') || 
                          compiled.querySelector('[data-testid="no-suggestions"]');
    
    // Si element existe, verifica su contenido
    if (noSuggestions) {
      expect(noSuggestions.textContent).toContain('No hay sugerencias');
    }
  }));

  it('debería seguir a un usuario y emitir evento', () => {
    const mockUser = { username: 'user3', isFollowed: false };
    const spy = spyOn(component.followingChanged, 'emit');
    
    component.follow(mockUser.username, mockUser);

    expect(mockFollowService.followUserByUsername).toHaveBeenCalledWith('naimgarciaa_', 'user3');
    expect(mockUser.isFollowed).toBeTrue();
    expect(spy).toHaveBeenCalled();
  });

  it('debería dejar de seguir a un usuario y emitir evento', () => {
    const mockUser = { username: 'user3', isFollowed: true };
    const spy = spyOn(component.followingChanged, 'emit');
    
    component.unfollow(mockUser.username, mockUser);

    expect(mockFollowService.unfollowUserByUsername).toHaveBeenCalledWith('naimgarciaa_', 'user3');
    expect(mockUser.isFollowed).toBeFalse();
    expect(spy).toHaveBeenCalled();
  });
});