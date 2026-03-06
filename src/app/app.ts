import { Component, signal } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { LeafletMap } from "./leaflet-map/leaflet-map";
import { NavigationComponent } from './leaflet-map/navigation/navigation.component';

@Component({
  selector: 'app-root',
  imports: [RouterModule, LeafletMap, NavigationComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Metromata');
}
