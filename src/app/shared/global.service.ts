import { Injectable } from '@angular/core';
import { Pipe, PipeTransform } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GlobalService {
  logo = "https://firebasestorage.googleapis.com/v0/b/visity-bd.firebasestorage.app/o/visityLogo.svg?alt=media&token=63c882d5-3364-44b5-a743-9f09b5ab3306"

  constructor() {}
}

@Pipe({
  name: 'fileToUrl',
  standalone: true
})

export class FileToUrlPipe implements PipeTransform {
  transform(file: File): string {
    return URL.createObjectURL(file);
  }
}