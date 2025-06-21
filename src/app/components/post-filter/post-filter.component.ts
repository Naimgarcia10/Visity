import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-post-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './post-filter.component.html',
  styleUrls: ['./post-filter.component.css']
})
export class PostFilterComponent {
  @Output() filtersChanged = new EventEmitter<any>();

  travelTypes = ['Mochilero', 'Aventura', 'Cultural', 'Gastronómico'];
  budgets = ['Económico (<500€)', 'Medio (500€ - 1500€)', 'Costoso (>1500€)'];
  weatherOptions = ['Cálido (playa, trópico)', 'Templado (primavera, otoño)', 'Frío (nieve, montaña)', 'Variable'];

  selectedFilters = {
    travelType: new Set<string>(),
    budget: new Set<string>(),
    weather: new Set<string>()
  };

  onCheckboxChange(category: 'travelType' | 'budget' | 'weather', event: any) {
    const value = event.target.value;
    const checked = event.target.checked;

    if (checked) {
      this.selectedFilters[category].add(value);
    } else {
      this.selectedFilters[category].delete(value);
    }

    this.filtersChanged.emit({
      travelType: Array.from(this.selectedFilters.travelType),
      budget: Array.from(this.selectedFilters.budget),
      weather: Array.from(this.selectedFilters.weather),
    });
  }

  resetFilters() {
    // Vaciar todos los sets
    this.selectedFilters.travelType.clear();
    this.selectedFilters.budget.clear();
    this.selectedFilters.weather.clear();

    // Desmarcar los checkboxes manualmente
    const inputs = document.querySelectorAll('input[type="checkbox"]');
    inputs.forEach(input => (input as HTMLInputElement).checked = false);

    // Emitir los filtros vacíos
    this.filtersChanged.emit({
      travelType: [],
      budget: [],
      weather: []
    });
  }

}