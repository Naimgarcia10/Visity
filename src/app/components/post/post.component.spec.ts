import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PostComponent } from './post.component';
import { PostService } from '../../shared/post.service';
import { AuthService } from '../../shared/auth.service';
import { of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';

describe('PostComponent', () => {
  let component: PostComponent;
  let fixture: ComponentFixture<PostComponent>;
  let mockPostService: any;
  let mockAuthService: any;

  beforeEach(async () => {
    mockPostService = {
      toggleLike: jasmine.createSpy('toggleLike').and.returnValue(Promise.resolve()),
      deletePost: jasmine.createSpy('deletePost').and.returnValue(Promise.resolve()),
      getComments: jasmine.createSpy('getComments').and.returnValue(Promise.resolve([])),
      addComment: jasmine.createSpy('addComment').and.returnValue(Promise.resolve())
    };

    mockAuthService = {
      getUserById: jasmine.createSpy('getUserById').and.returnValue(Promise.resolve({
        username: 'naimgarciaa_',
        profilePic: 'some-url'
      })),
      getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue(Promise.resolve({ uid: 'user123' })),
      getUsernameById: jasmine.createSpy('getUsernameById').and.returnValue(Promise.resolve('naimgarciaa_'))
    };

    await TestBed.configureTestingModule({
      imports: [PostComponent, FormsModule, RouterTestingModule],
      providers: [
        { provide: PostService, useValue: mockPostService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PostComponent);
    component = fixture.componentInstance;
    component.post = {
      id: 'post123',
      authorId: 'user123',
      content: 'Contenido de prueba',
      budget: 'Bajo',
      commentsCount: 0,
      createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 60) }, // hace 1h
      imageURLs: ['img1.jpg'],
      itineraryURL: '',
      likedBy: [],
      likes: 0,
      travelType: ['Cultural'],
      weather: 'Soleado'
    };
  });

  it('debería crear el componente', async () => {
    await component.ngOnInit();
    expect(component).toBeTruthy();
    expect(component.authorUsername).toBe('naimgarciaa_');
  });

  it('debería emitir el evento "liked" al dar like', async () => {
    spyOn(component.liked, 'emit');
    await component.ngOnInit();
    await component.toggleLike();

    expect(mockPostService.toggleLike).toHaveBeenCalledWith('post123', 'user123');
    expect(component.liked.emit).toHaveBeenCalled();
  });

  it('debería emitir el evento "deleted" al eliminar el post', async () => {
    spyOn(window, 'confirm').and.returnValue(true); // simula confirmación
    spyOn(component.deleted, 'emit');
    await component.ngOnInit();

    await component.deletePost();

    expect(mockPostService.deletePost).toHaveBeenCalledWith('post123');
    expect(component.deleted.emit).toHaveBeenCalled();
  });
});
