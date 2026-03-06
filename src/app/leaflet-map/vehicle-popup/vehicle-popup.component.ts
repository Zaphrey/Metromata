import { Component, Input } from '@angular/core';
import { MartaVehicle } from '../../services/marta-location.service';
import { MartaRoute } from '../../services/marta-route.service';
import { OccupancyStatusPipe } from './occupancy-status.pipe';

@Component({
  selector: 'app-vehicle-popup',
  imports: [OccupancyStatusPipe],
  templateUrl: './vehicle-popup.component.html',
  styleUrl: './vehicle-popup.component.css',
})
export class VehiclePopupComponent {
  @Input() vehicle?: MartaVehicle;
  @Input() route?: MartaRoute;

  currentRoute?: MartaRoute;

  constructor() {}
}
